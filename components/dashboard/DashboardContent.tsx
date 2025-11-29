'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TimeLogWithProfile } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { CalendarIcon, Search, X, ChevronLeft, ChevronRight, Users, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

const PAGE_SIZES = [10, 25, 50, 100]

type DateFilterType = 'all' | 'greater' | 'less' | 'between'

export function DashboardContent() {
  const [logs, setLogs] = useState<TimeLogWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)

  // Filters
  const [searchEmail, setSearchEmail] = useState('')
  const [dateFilterType, setDateFilterType] = useState<DateFilterType>('all')
  const [dateFrom, setDateFrom] = useState<Date | undefined>()
  const [dateTo, setDateTo] = useState<Date | undefined>()

  // Pagination
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const supabase = createClient()

  const fetchLogs = useCallback(async () => {
    setLoading(true)

    let query = supabase
      .from('time_logs')
      .select('*, profiles!inner(email)', { count: 'exact' })
      .order('date', { ascending: false })

    // Apply email filter
    if (searchEmail.trim()) {
      query = query.ilike('profiles.email', `%${searchEmail.trim()}%`)
    }

    // Apply date filters
    if (dateFilterType === 'greater' && dateFrom) {
      query = query.gte('date', format(dateFrom, 'yyyy-MM-dd'))
    } else if (dateFilterType === 'less' && dateTo) {
      query = query.lte('date', format(dateTo, 'yyyy-MM-dd'))
    } else if (dateFilterType === 'between' && dateFrom && dateTo) {
      query = query
        .gte('date', format(dateFrom, 'yyyy-MM-dd'))
        .lte('date', format(dateTo, 'yyyy-MM-dd'))
    }

    // Apply pagination
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)

    const { data, count, error } = await query

    if (error) {
      console.error('Error fetching logs:', error)
    } else {
      setLogs(data as TimeLogWithProfile[] || [])
      setTotalCount(count || 0)
    }

    setLoading(false)
  }, [supabase, searchEmail, dateFilterType, dateFrom, dateTo, page, pageSize])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [searchEmail, dateFilterType, dateFrom, dateTo, pageSize])

  const resetFilters = () => {
    setSearchEmail('')
    setDateFilterType('all')
    setDateFrom(undefined)
    setDateTo(undefined)
    setPage(1)
  }

  const totalPages = Math.ceil(totalCount / pageSize)
  const hasFilters = searchEmail || dateFilterType !== 'all'

  // Stats
  const totalHours = logs.reduce((sum, log) => sum + Number(log.hours), 0)
  const uniqueUsers = new Set(logs.map(log => log.user_id)).size

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Quản lý thời gian làm việc của team</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng số bản ghi</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng giờ (trang này)</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalHours.toFixed(1)}h</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Members (trang này)</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueUsers}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bộ lọc</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
            {/* Email Search */}
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">Tìm theo email</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Nhập email..."
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Date Filter Type */}
            <div className="w-full lg:w-48 space-y-2">
              <label className="text-sm font-medium">Lọc theo ngày</label>
              <Select value={dateFilterType} onValueChange={(v) => setDateFilterType(v as DateFilterType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="greater">Từ ngày</SelectItem>
                  <SelectItem value="less">Đến ngày</SelectItem>
                  <SelectItem value="between">Trong khoảng</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date From */}
            {(dateFilterType === 'greater' || dateFilterType === 'between') && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Từ</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full lg:w-40 justify-start text-left font-normal',
                        !dateFrom && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, 'dd/MM/yyyy') : 'Chọn ngày'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateFrom}
                      onSelect={setDateFrom}
                      locale={vi}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {/* Date To */}
            {(dateFilterType === 'less' || dateFilterType === 'between') && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Đến</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full lg:w-40 justify-start text-left font-normal',
                        !dateTo && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateTo ? format(dateTo, 'dd/MM/yyyy') : 'Chọn ngày'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateTo}
                      onSelect={setDateTo}
                      locale={vi}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {/* Reset Button */}
            {hasFilters && (
              <Button variant="ghost" onClick={resetFilters} className="gap-2">
                <X className="h-4 w-4" />
                Xóa lọc
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-pulse text-muted-foreground">Đang tải...</div>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Clock className="h-12 w-12 mb-4 opacity-50" />
              <p>Không có dữ liệu</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Ngày</TableHead>
                      <TableHead className="text-right">Số giờ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">{log.profiles.email}</TableCell>
                        <TableCell>{format(new Date(log.date), 'dd/MM/yyyy')}</TableCell>
                        <TableCell className="text-right">{Number(log.hours).toFixed(1)}h</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden divide-y">
                {logs.map((log) => (
                  <div key={log.id} className="p-4 space-y-1">
                    <p className="font-medium text-sm">{log.profiles.email}</p>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{format(new Date(log.date), 'dd/MM/yyyy')}</span>
                      <span className="font-medium text-foreground">{Number(log.hours).toFixed(1)}h</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalCount > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Hiển thị</span>
            <Select value={pageSize.toString()} onValueChange={(v) => setPageSize(Number(v))}>
              <SelectTrigger className="w-20 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span>/ {totalCount} kết quả</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm min-w-[100px] text-center">
              Trang {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
