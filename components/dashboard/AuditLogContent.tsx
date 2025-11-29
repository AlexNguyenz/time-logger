'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AuditLogWithProfile, TimeLog } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Search, ChevronLeft, ChevronRight, Eye, Plus, Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const PAGE_SIZES = [10, 25, 50, 100]

export function AuditLogContent() {
  const [logs, setLogs] = useState<AuditLogWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [searchEmail, setSearchEmail] = useState('')
  const [filterAction, setFilterAction] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [selectedLog, setSelectedLog] = useState<AuditLogWithProfile | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const supabase = createClient()

  const fetchLogs = useCallback(async () => {
    setLoading(true)

    let query = supabase
      .from('audit_logs')
      .select('*, profiles!inner(email)', { count: 'exact' })
      .order('changed_at', { ascending: false })

    if (searchEmail.trim()) {
      query = query.ilike('profiles.email', `%${searchEmail.trim()}%`)
    }

    if (filterAction !== 'all') {
      query = query.eq('action', filterAction)
    }

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)

    const { data, count, error } = await query

    if (error) {
      console.error('Error fetching audit logs:', error)
    } else {
      setLogs((data as AuditLogWithProfile[]) || [])
      setTotalCount(count || 0)
    }

    setLoading(false)
  }, [supabase, searchEmail, filterAction, page, pageSize])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  useEffect(() => {
    setPage(1)
  }, [searchEmail, filterAction, pageSize])

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'create':
        return (
          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
            <Plus className="w-3 h-3 mr-1" />
            Tạo mới
          </Badge>
        )
      case 'update':
        return (
          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
            <Pencil className="w-3 h-3 mr-1" />
            Cập nhật
          </Badge>
        )
      case 'delete':
        return (
          <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
            <Trash2 className="w-3 h-3 mr-1" />
            Xóa
          </Badge>
        )
      default:
        return <Badge>{action}</Badge>
    }
  }

  const formatChange = (log: AuditLogWithProfile) => {
    const oldData = log.old_data as TimeLog | null
    const newData = log.new_data as TimeLog | null

    if (log.action === 'create' && newData) {
      return `Tạo log ${newData.hours}h cho ngày ${format(new Date(newData.date), 'dd/MM/yyyy')}`
    }
    if (log.action === 'update' && oldData && newData) {
      return `${oldData.hours}h → ${newData.hours}h (ngày ${format(new Date(newData.date), 'dd/MM/yyyy')})`
    }
    if (log.action === 'delete' && oldData) {
      return `Xóa log ${oldData.hours}h ngày ${format(new Date(oldData.date), 'dd/MM/yyyy')}`
    }
    return '-'
  }

  const openDetail = (log: AuditLogWithProfile) => {
    setSelectedLog(log)
    setDetailOpen(true)
  }

  const totalPages = Math.ceil(totalCount / pageSize)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Lịch sử thay đổi</h1>
        <p className="text-muted-foreground">Theo dõi mọi thay đổi của time logs</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Tìm theo email..."
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Hành động" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="create">Tạo mới</SelectItem>
                <SelectItem value="update">Cập nhật</SelectItem>
                <SelectItem value="delete">Xóa</SelectItem>
              </SelectContent>
            </Select>
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
              <p>Không có dữ liệu</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Thời gian</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Hành động</TableHead>
                      <TableHead>Chi tiết</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {format(new Date(log.changed_at), 'dd/MM/yyyy HH:mm:ss', { locale: vi })}
                        </TableCell>
                        <TableCell className="font-medium">{log.profiles.email}</TableCell>
                        <TableCell>{getActionBadge(log.action)}</TableCell>
                        <TableCell className="text-sm">{formatChange(log)}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDetail(log)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden divide-y">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-4 space-y-2 cursor-pointer hover:bg-muted/50"
                    onClick={() => openDetail(log)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{log.profiles.email}</span>
                      {getActionBadge(log.action)}
                    </div>
                    <p className="text-sm text-muted-foreground">{formatChange(log)}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(log.changed_at), 'dd/MM/yyyy HH:mm:ss', { locale: vi })}
                    </p>
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

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Chi tiết thay đổi</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Thời gian</p>
                  <p className="font-medium">
                    {format(new Date(selectedLog.changed_at), 'dd/MM/yyyy HH:mm:ss', { locale: vi })}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Người thực hiện</p>
                  <p className="font-medium">{selectedLog.profiles.email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Hành động</p>
                  <div className="mt-1">{getActionBadge(selectedLog.action)}</div>
                </div>
                <div>
                  <p className="text-muted-foreground">Bảng</p>
                  <p className="font-medium">{selectedLog.table_name}</p>
                </div>
              </div>

              {selectedLog.old_data && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Dữ liệu cũ</p>
                  <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-3 text-sm">
                    <pre className="whitespace-pre-wrap text-red-700 dark:text-red-400">
                      {JSON.stringify(selectedLog.old_data, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {selectedLog.new_data && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Dữ liệu mới</p>
                  <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3 text-sm">
                    <pre className="whitespace-pre-wrap text-green-700 dark:text-green-400">
                      {JSON.stringify(selectedLog.new_data, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
