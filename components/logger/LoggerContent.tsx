'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TimeLog, TimeLogWithProfile } from '@/lib/types'
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
import { ChevronLeft, ChevronRight, Clock, Loader2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface LoggerContentProps {
  userId: string
  isAdmin?: boolean
}

interface MemberLog {
  email: string
  hours: number
}

const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

export function LoggerContent({ userId, isAdmin = false }: LoggerContentProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [logs, setLogs] = useState<TimeLog[]>([])
  const [memberLogs, setMemberLogs] = useState<TimeLogWithProfile[]>([])
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

    if (isAdmin) {
      // Admin: fetch all member logs (users with role = 'user')
      const { data, error } = await supabase
        .from('time_logs')
        .select('*, profiles!inner(email, role)')
        .eq('profiles.role', 'user')
        .gte('date', format(start, 'yyyy-MM-dd'))
        .lte('date', format(end, 'yyyy-MM-dd'))

      if (error) {
        console.error('Error fetching logs:', error)
        toast.error('Không thể tải dữ liệu')
      } else {
        setMemberLogs((data as TimeLogWithProfile[]) || [])
      }
    } else {
      // User: fetch only their own logs
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
    }
    setLoading(false)
  }, [supabase, userId, currentMonth, isAdmin])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const getLogForDate = (date: Date): TimeLog | undefined => {
    return logs.find((log) => isSameDay(new Date(log.date), date))
  }

  const getMemberLogsForDate = (date: Date): MemberLog[] => {
    return memberLogs
      .filter((log) => isSameDay(new Date(log.date), date))
      .map((log) => ({
        email: log.profiles.email,
        hours: Number(log.hours),
      }))
  }

  const handleDayClick = (date: Date) => {
    if (isAdmin) {
      // Admin: show member logs dialog (view only)
      setSelectedDate(date)
      setDialogOpen(true)
    } else {
      // User: show log time dialog
      setSelectedDate(date)
      const existingLog = getLogForDate(date)
      setHours(existingLog ? String(existingLog.hours) : '')
      setDialogOpen(true)
    }
  }

  const handleSave = async () => {
    if (!selectedDate || isAdmin) return

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
    if (!selectedDate || isAdmin) return

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

  // Stats
  const totalHours = isAdmin
    ? memberLogs.reduce((sum, log) => sum + Number(log.hours), 0)
    : logs.reduce((sum, log) => sum + Number(log.hours), 0)

  const daysLogged = isAdmin
    ? new Set(memberLogs.map(log => log.date)).size
    : logs.length

  const totalMembers = isAdmin
    ? new Set(memberLogs.map(log => log.user_id)).size
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {isAdmin ? 'Team Logger' : 'Time Logger'}
        </h1>
        <p className="text-muted-foreground">
          {isAdmin
            ? 'Xem thời gian làm việc của các thành viên'
            : 'Ghi nhận thời gian làm việc hàng ngày'}
        </p>
      </div>

      {/* Stats */}
      <div className={cn('grid gap-4', isAdmin ? 'grid-cols-3' : 'grid-cols-2')}>
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
        {isAdmin && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Số members
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalMembers}</div>
            </CardContent>
          </Card>
        )}
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
                  const isSunday = day.getDay() === 0

                  // Get data based on role
                  const userLog = !isAdmin ? getLogForDate(day) : null
                  const dayMemberLogs = isAdmin ? getMemberLogsForDate(day) : []
                  const hasData = isAdmin ? dayMemberLogs.length > 0 : !!userLog

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

                      {/* Display based on role */}
                      {isCurrentMonth && hasData && (
                        <div className="w-full px-1 space-y-0.5 overflow-hidden">
                          {isAdmin ? (
                            // Admin: show member count and total hours
                            <div className={cn(
                              'rounded-md px-1.5 py-0.5 text-xs font-medium text-center truncate',
                              'bg-blue-100 text-blue-700 border border-blue-200'
                            )}>
                              <Users className="inline h-3 w-3 mr-1" />
                              {dayMemberLogs.length} ({dayMemberLogs.reduce((s, l) => s + l.hours, 0).toFixed(1)}h)
                            </div>
                          ) : (
                            // User: show their hours
                            <div className={cn(
                              'rounded-md px-1.5 py-0.5 text-xs font-medium text-center truncate',
                              'bg-primary/15 text-primary border border-primary/20'
                            )}>
                              {Number(userLog!.hours).toFixed(1)}h
                            </div>
                          )}
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

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isAdmin ? <Users className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
              {isAdmin ? 'Chi tiết ngày' : 'Log thời gian'}
            </DialogTitle>
            <DialogDescription>
              {selectedDate && format(selectedDate, 'EEEE, dd MMMM yyyy', { locale: vi })}
            </DialogDescription>
          </DialogHeader>

          {isAdmin ? (
            // Admin: show list of members who logged
            <div className="py-4">
              {selectedDate && getMemberLogsForDate(selectedDate).length > 0 ? (
                <div className="space-y-2">
                  {getMemberLogsForDate(selectedDate).map((log, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <span className="text-sm font-medium truncate flex-1 mr-2">
                        {log.email}
                      </span>
                      <span className="text-sm font-bold text-primary">
                        {log.hours.toFixed(1)}h
                      </span>
                    </div>
                  ))}
                  <div className="pt-2 border-t mt-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Tổng cộng</span>
                      <span className="font-bold">
                        {getMemberLogsForDate(selectedDate)
                          .reduce((s, l) => s + l.hours, 0)
                          .toFixed(1)}h
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Chưa có ai log thời gian cho ngày này
                </p>
              )}
            </div>
          ) : (
            // User: show input form
            <>
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
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
