export type UserRoute = {
  id: string;
  default_route: string;
  custom_route: string | null;
  user_name?: string;
};

export type RouteStore = {
  findById(id: string): Promise<UserRoute | null>;
  close(): Promise<void>;
};
