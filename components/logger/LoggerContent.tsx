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
import { DayPicker } from 'react-day-picker'
import { format, startOfMonth, endOfMonth, isSameDay } from 'date-fns'
import { vi } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Clock, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface LoggerContentProps {
  userId: string
}

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

  const goToPreviousMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  const goToToday = () => {
    setCurrentMonth(new Date())
  }

  const totalHours = logs.reduce((sum, log) => sum + Number(log.hours), 0)
  const daysLogged = logs.length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Time Logger</h1>
        <p className="text-muted-foreground">Ghi nhận thời gian làm việc hàng ngày</p>
      </div>

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

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              {format(currentMonth, 'MMMM yyyy', { locale: vi })}
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday}>
                Hôm nay
              </Button>
              <Button variant="outline" size="sm" onClick={goToNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <DayPicker
              mode="single"
              month={currentMonth}
              onMonthChange={setCurrentMonth}
              locale={vi}
              showOutsideDays={false}
              hideNavigation
              className="w-full"
              classNames={{
                months: 'w-full',
                month: 'w-full',
                month_caption: 'hidden',
                weekdays: 'flex w-full',
                weekday: 'text-muted-foreground flex-1 font-normal text-[0.8rem] text-center py-2',
                week: 'flex w-full',
                day: 'flex-1 p-0.5',
              }}
              components={{
                DayButton: (props) => {
                  const log = getLogForDate(props.day.date)
                  const isToday = isSameDay(props.day.date, new Date())

                  return (
                    <button
                      onClick={() => handleDayClick(props.day.date)}
                      className={cn(
                        'w-full h-14 sm:h-16 rounded-lg flex flex-col items-center justify-center gap-0.5',
                        'hover:bg-accent hover:text-accent-foreground transition-colors',
                        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                        isToday && 'ring-2 ring-primary',
                        log && 'bg-primary/10'
                      )}
                    >
                      <span className={cn(
                        'text-sm',
                        isToday && 'font-bold text-primary'
                      )}>
                        {props.day.date.getDate()}
                      </span>
                      {log && (
                        <span className="text-[10px] sm:text-xs text-primary font-medium">
                          {Number(log.hours).toFixed(1)}h
                        </span>
                      )}
                    </button>
                  )
                },
              }}
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Log thời gian
            </DialogTitle>
            <DialogDescription>
              {selectedDate && format(selectedDate, 'EEEE, dd/MM/yyyy', { locale: vi })}
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
