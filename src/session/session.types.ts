export enum SessionStatus {
  ACTIVE = "ACTIVE",
  CLOSED = "CLOSED"
}
export type CreateSession =  {
  language : string
}

export type UpdateSession = {
  source_code : string
}