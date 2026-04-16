export interface Profile {
  id: string
  display_name: string | null
  location_lat: number | null
  location_lng: number | null
  timezone: string
  prayer_method: number | null
  presets: UserPresets | null
  created_at: string
}

export interface UserPresets {
  avoidances: string[]
  boundaries: string[]
  buckets?: string[]
  // Persistent task inbox — tasks the user captures outside a session and
  // can pull into Musharata when starting one. Not session-scoped.
  task_pool?: Array<{ text: string; bucket?: string }>
}

export interface Session {
  id: string
  user_id: string
  name: string | null
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

export interface MusharataBlock {
  label: string
  start: string
  end: string
  tasks: { text: string; completed: boolean; bucket?: string }[]
}

export interface MusharataData {
  // Absent on legacy sessions — treat undefined as 'time_block'.
  mode?: 'time_block' | 'full_day'
  tasks: { text: string; completed: boolean; bucket?: string }[]
  // Only populated in full_day mode. Top-level `tasks` is also populated
  // (flattened from blocks, with bucket = block.label) so downstream
  // steps (Muraqaba timer, Muhasaba checklist) keep working unchanged.
  blocks?: MusharataBlock[]
  avoidances: string[]
  boundaries: string[]
  // In full_day mode, these are the day envelope (first block start → last block end).
  time_block_start: string
  time_block_end: string
  dua_recited: boolean
}

export interface MuraqabaBlockResult {
  label: string
  drift_count: number
  session_start: string
  session_end: string
  duration_minutes: number
}

export interface MuraqabaData {
  mode?: 'time_block' | 'full_day'
  drift_count: number
  session_start: string
  session_end: string
  duration_minutes: number
  // Only present when mode === 'full_day'.
  blocks?: MuraqabaBlockResult[]
}

export interface MuhasabaData {
  tasks_completed: number
  tasks_total: number
  time_drains: string[]
  reflection: string
  // Tasks explicitly marked incomplete during self-accounting. Used by Muataba
  // to offer carry-forward, and by the review page for full detail.
  incomplete_tasks?: Array<{ text: string; bucket?: string }>
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
  // Tasks the user explicitly chose to carry forward to tomorrow's Musharata.
  // Populated at Muataba submission; consumed by the next new-session flow.
  carry_tasks?: Array<{ text: string; bucket?: string }>
}

export interface PrayerTimes {
  Fajr: string
  Dhuhr: string
  Asr: string
  Maghrib: string
  Isha: string
}
