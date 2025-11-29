'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TimeLog } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from 'date-fns'
import { vi } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Clock, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface LoggerContentProps {
  userId: string
}

const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

export function LoggerContent({ userId }: LoggerContentProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [logs, setLogs] = useState<TimeLog[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [hours, setHours] = useState('')
  const [saving, setSaving] = useState(false)

  const supabase = createClient()

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    const start = startOfMonth(currentMonth)
    const end = endOfMonth(currentMonth)

    const { data, error } = await supabase
      .from('time_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('date', format(start, 'yyyy-MM-dd'))
      .lte('date', format(end, 'yyyy-MM-dd'))

    if (error) {
      console.error('Error fetching logs:', error)
      toast.error('Không thể tải dữ liệu')
    } else {
      setLogs((data as TimeLog[]) || [])
    }
    setLoading(false)
  }, [supabase, userId, currentMonth])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const getLogForDate = (date: Date): TimeLog | undefined => {
    return logs.find((log) => isSameDay(new Date(log.date), date))
  }

  const handleDayClick = (date: Date) => {
    setSelectedDate(date)
    const existingLog = getLogForDate(date)
    setHours(existingLog ? String(existingLog.hours) : '')
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!selectedDate) return

    const hoursNum = parseFloat(hours)
    if (isNaN(hoursNum) || hoursNum < 0 || hoursNum > 24) {
      toast.error('Số giờ phải từ 0 đến 24')
      return
    }

    setSaving(true)
    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    const existingLog = getLogForDate(selectedDate)

    try {
      if (existingLog) {
        const { error } = await supabase
          .from('time_logs')
          .update({ hours: hoursNum })
          .eq('id', existingLog.id)

        if (error) throw error
        toast.success('Đã cập nhật thời gian')
      } else {
        const { error } = await supabase
          .from('time_logs')
          .insert({ user_id: userId, date: dateStr, hours: hoursNum })

        if (error) throw error
        toast.success('Đã lưu thời gian')
      }

      setDialogOpen(false)
      fetchLogs()
    } catch (error) {
      console.error('Error saving log:', error)
      toast.error('Không thể lưu. Vui lòng thử lại.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedDate) return

    const existingLog = getLogForDate(selectedDate)
    if (!existingLog) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('time_logs')
        .delete()
        .eq('id', existingLog.id)

      if (error) throw error
      toast.success('Đã xóa')
      setDialogOpen(false)
      fetchLogs()
    } catch (error) {
      console.error('Error deleting log:', error)
      toast.error('Không thể xóa. Vui lòng thử lại.')
    } finally {
      setSaving(false)
    }
  }

  // Generate calendar days
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const totalHours = logs.reduce((sum, log) => sum + Number(log.hours), 0)
  const daysLogged = logs.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Time Logger</h1>
        <p className="text-muted-foreground">Ghi nhận thời gian làm việc hàng ngày</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tổng giờ tháng này
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalHours.toFixed(1)}h</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Số ngày đã log
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{daysLogged}</div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar */}
      <Card className="overflow-hidden">
        {/* Calendar Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold capitalize">
              {format(currentMonth, 'MMMM yyyy', { locale: vi })}
            </h2>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setCurrentMonth(new Date())}
            >
              Hôm nay
            </Button>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="select-none">
              {/* Weekday Headers */}
              <div className="grid grid-cols-7 border-b bg-muted/20">
                {WEEKDAYS.map((day, index) => (
                  <div
                    key={day}
                    className={cn(
                      'py-2 text-center text-xs font-medium text-muted-foreground',
                      index === 0 && 'text-red-500'
                    )}
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7">
                {calendarDays.map((day, index) => {
                  const isCurrentMonth = isSameMonth(day, currentMonth)
                  const isToday = isSameDay(day, new Date())
                  const log = getLogForDate(day)
                  const isSunday = day.getDay() === 0

                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => handleDayClick(day)}
                      className={cn(
                        'relative flex flex-col items-center justify-start p-1 min-h-20 sm:min-h-24 border-b border-r transition-colors',
                        'hover:bg-accent/50 focus:outline-none focus:bg-accent/50',
                        index % 7 === 6 && 'border-r-0',
                        !isCurrentMonth && 'bg-muted/20',
                      )}
                    >
                      {/* Date Number */}
                      <div
                        className={cn(
                          'flex items-center justify-center w-7 h-7 rounded-full text-sm mb-1',
                          isToday && 'bg-primary text-primary-foreground font-bold',
                          !isToday && isSunday && isCurrentMonth && 'text-red-500',
                          !isCurrentMonth && 'text-muted-foreground/50'
                        )}
                      >
                        {format(day, 'd')}
                      </div>

                      {/* Time Log Display */}
                      {log && isCurrentMonth && (
                        <div className={cn(
                          'w-full px-1'
                        )}>
                          <div className={cn(
                            'rounded-md px-1.5 py-0.5 text-xs font-medium text-center truncate',
                            'bg-primary/15 text-primary border border-primary/20'
                          )}>
                            {Number(log.hours).toFixed(1)}h
                          </div>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Log Time Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Log thời gian
            </DialogTitle>
            <DialogDescription>
              {selectedDate && format(selectedDate, 'EEEE, dd MMMM yyyy', { locale: vi })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="hours">Số giờ làm việc</Label>
              <Input
                id="hours"
                type="number"
                step="0.5"
                min="0"
                max="24"
                placeholder="Ví dụ: 8"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                className="text-lg h-12"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Nhập số giờ từ 0 đến 24 (có thể dùng số thập phân như 7.5)
              </p>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            {selectedDate && getLogForDate(selectedDate) && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={saving}
                className="w-full sm:w-auto"
              >
                Xóa
              </Button>
            )}
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
                className="flex-1"
              >
                Hủy
              </Button>
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Lưu
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
