export interface WakaTimeStatsResponse {
  data: WakaTimeStatsData;
}

export interface WakaTimeStatsData {
  ai_additions: number;
  ai_deletions: number;
  best_day: BestDay;
  categories: Category[];
  created_at: string;
  daily_average: number;
  daily_average_including_other_language: number;
  days_including_holidays: number;
  days_minus_holidays: number;
  dependencies: Dependency[];
  editors: Editor[];
  end: string;
  holidays: number;
  human_additions: number;
  human_deletions: number;
  human_readable_daily_average: string;
  human_readable_daily_average_including_other_language: string;
  human_readable_range: string;
  human_readable_total: string;
  human_readable_total_including_other_language: string;
  id: string;
  is_already_updating: boolean;
  is_cached: boolean;
  is_category_usage_visible: boolean;
  is_coding_activity_visible: boolean;
  is_editor_usage_visible: boolean;
  is_including_today: boolean;
  is_language_usage_visible: boolean;
  is_os_usage_visible: boolean;
  is_stuck: boolean;
  is_up_to_date: boolean;
  is_up_to_date_pending_future: boolean;
  languages: Language[];
  machines: Machine[];
  modified_at: string;
  operating_systems: OperatingSystem[];
  percent_calculated: number;
  projects: Project[];
  range: string;
  start: string;
  status: string;
  timeout: number;
  timezone: string;
  total_seconds: number;
  total_seconds_including_other_language: number;
  user_id: string;
  username: unknown | null;
  writes_only: boolean;
}

export interface TimedUsage {
  decimal: string;
  digital: string;
  hours: number;
  minutes: number;
  name: string;
  percent: number;
  text: string;
  total_seconds: number;
}

export interface BestDay {
  date: string;
  text: string;
  total_seconds: number;
}

export interface Category extends TimedUsage {}

export interface Dependency extends TimedUsage {}

export interface Editor extends TimedUsage {}

export interface Language extends TimedUsage {}

export interface Machine extends TimedUsage {
  machine_name_id: string;
}

export interface OperatingSystem extends TimedUsage {}

export interface Project extends TimedUsage {
  ai_additions: number;
  ai_deletions: number;
  human_additions: number;
  human_deletions: number;
}

export interface WakaTimeErrorResponse {
  errors?: string[];
}
