export type Client = {
  id: string;
  telegram_id?: number | null;
  telegram_username?: string | null;
  first_name: string;
  last_name?: string | null;
  status: "lead" | "active" | "paused" | "archived";
  goal?: string | null;
  goal_details?: string | null;
  training_experience?: string | null;
  age?: number | null;
  training_location?: string | null;
  equipment: string[];
  training_days_per_week?: number | null;
  session_duration_minutes?: number | null;
  movement_limitations?: string | null;
  recovery_notes?: string | null;
  coach_notes?: string | null;
  created_at: string;
  updated_at: string;
};

export type ClientSummary = Client & {
  active_program_count: number;
  active_nutrition_plan_count: number;
  sessions_remaining: number;
  last_measurement_at?: string | null;
};

export interface ClientsRepository {
  list(): Promise<ClientSummary[]>;
  getById(id: string): Promise<Client>;
}

export class SupabaseClientsRepository implements ClientsRepository {
  constructor(private readonly supabase: any) {}

  async list(): Promise<ClientSummary[]> {
    const { data, error } = await this.supabase
      .from("clients")
      .select("*")
      .neq("status", "archived")
      .order("updated_at", { ascending: false });
    if (error) throw error;

    const clients = (data ?? []) as Client[];
    return Promise.all(clients.map(async client => {
      const [programs, nutrition, payments, measurement] = await Promise.all([
        this.supabase.from("training_programs").select("id", { count: "exact", head: true })
          .eq("client_id", client.id).eq("status", "active"),
        this.supabase.from("nutrition_plans").select("id", { count: "exact", head: true })
          .eq("client_id", client.id).eq("status", "active"),
        this.supabase.from("payment_records").select("sessions_purchased,sessions_used")
          .eq("client_id", client.id).eq("status", "active"),
        this.supabase.from("measurements").select("measured_on")
          .eq("client_id", client.id).order("measured_on", { ascending: false }).limit(1)
      ]);
      if (programs.error) throw programs.error;
      if (nutrition.error) throw nutrition.error;
      if (payments.error) throw payments.error;
      if (measurement.error) throw measurement.error;

      const sessionsRemaining = (payments.data ?? []).reduce(
        (sum: number, p: any) => sum + Math.max(0, (p.sessions_purchased ?? 0) - (p.sessions_used ?? 0)), 0
      );

      return {
        ...client,
        active_program_count: programs.count ?? 0,
        active_nutrition_plan_count: nutrition.count ?? 0,
        sessions_remaining: sessionsRemaining,
        last_measurement_at: measurement.data?.[0]?.measured_on ?? null
      };
    }));
  }

  async getById(id: string): Promise<Client> {
    const { data, error } = await this.supabase.from("clients").select("*").eq("id", id).single();
    if (error) throw error;
    return data as Client;
  }
}
