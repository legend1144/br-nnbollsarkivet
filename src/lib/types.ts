export type AppRole = "member" | "referee" | "admin";

export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "INVALID_INPUT"
  | "NOT_FOUND"
  | "ARCHIVE_RUNTIME_NOT_READY"
  | "RATE_LIMITED_SOFT"
  | "INVALID_CODE"
  | "CODE_EXPIRED"
  | "NOT_ALLOWED_EMAIL"
  | "INTERNAL_ERROR";

export type ApiError = {
  code: ApiErrorCode;
  message: string;
  details?: unknown;
};

export type SessionUser = {
  id: string;
  email: string;
  role: AppRole;
  sessionId: string;
};

export type TacticPlayer = {
  id: string;
  name: string;
  isBurner?: boolean;
  number?: string;
  role?: string;
  x: number;
  y: number;
  radius?: number;
};

export type TacticPassChain = {
  id: string;
  name: string;
  playerIds: string[];
};

export type TacticCone = {
  id: string;
  x: number;
  y: number;
};

export type TacticBoardDto = {
  key: string;
  players: TacticPlayer[];
  passChains: TacticPassChain[];
  cones: TacticCone[];
  updatedAt: string;
};
