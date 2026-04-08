export interface Profile {
  id: string
  display_name: string | null
  location_lat: number | null
  location_lng: number | null
  created_at: string
}

export interface Session {
  id: string
  user_id: string
  current_step: number
  status: 'active' | 'completed' | 'abandoned'
  musharata: MusharataData | null
  muraqaba: MuraqabaData | null
  muhasaba: MuhasabaData | null
  muaqaba: MuaqabaData | null
  mujahada: MujuhadaData | null
  muataba: MuatabaData | null
  started_at: string
  completed_at: string | null
  session_duration_minutes: number | null
}

export interface MusharataData {
  tasks: { text: string; completed: boolean }[]
  avoidances: string[]
  boundaries: string[]
  time_block_start: string
  time_block_end: string
  dua_recited: boolean
}

export interface MuraqabaData {
  drift_count: number
  session_start: string
  session_end: string
  duration_minutes: number
}

export interface MuhasabaData {
  tasks_completed: number
  tasks_total: number
  time_drains: string[]
  reflection: string
}

export interface MuaqabaData {
  adjustments: string[]
  notes: string
}

export interface MujuhadaData {
  nafs_lies: string[]
  strategies: string[]
  reflection: string
}

export interface MuatabaData {
  patterns: string[]
  change_for_tomorrow: string
  gratitude: string
}

export interface PrayerTimes {
  Fajr: string
  Dhuhr: string
  Asr: string
  Maghrib: string
  Isha: string
}
