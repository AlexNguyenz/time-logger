export type UserRole = 'admin' | 'user'

export interface Profile {
  id: string
  email: string
  role: UserRole
  created_at: string
  updated_at: string
}

export interface TimeLog {
  id: string
  user_id: string
  date: string
  hours: number
  created_at: string
  updated_at: string
}

export interface TimeLogWithProfile extends TimeLog {
  profiles: {
    email: string
  }
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at' | 'updated_at'>
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>
      }
      time_logs: {
        Row: TimeLog
        Insert: Omit<TimeLog, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<TimeLog, 'id' | 'user_id' | 'created_at'>>
      }
    }
  }
}
