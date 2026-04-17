export class AppError extends Error {
  statusCode: number;
  constructor(code: ErrorType, message: string) {
    super(message);
    this.statusCode = code.valueOf();
  }
}


export enum ErrorType {
  BAD_REQUEST = 400, // Request sai định dạng, thiếu field, validate fail
  UNAUTHORIZED = 401, // Chưa đăng nhập hoặc token không hợp lệ
  FORBIDDEN = 403, // Không có quyền truy cập
  NOT_FOUND = 404, // Không tìm thấy tài nguyên
  CONFLICT = 409, // Dữ liệu trùng lặp (VD: email đã tồn tại)
  UNPROCESSABLE_ENTITY = 422, // Dữ liệu hợp lệ nhưng không xử lý được (business logic)
  TOO_MANY_REQUESTS = 429, // Quá nhiều request (rate limit)

  // --- 5xx: Server Errors ---
  INTERNAL_SERVER_ERROR = 500, // Lỗi server không xác định
}
