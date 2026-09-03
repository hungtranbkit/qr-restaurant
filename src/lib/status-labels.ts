export const ORDER_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Nháp",
  SUBMITTED: "Đã nhận",
  PREPARING: "Đang chuẩn bị",
  READY: "Sẵn sàng",
  SERVED: "Đã phục vụ",
  CANCELLED: "Đã huỷ",
};

export const TABLE_STATUS_LABEL: Record<string, string> = {
  AVAILABLE: "Trống",
  OCCUPIED: "Đang dùng",
  ORDERING: "Đang chọn món",
  WAITING_FOOD: "Chờ món",
  DINING: "Đang dùng bữa",
  PAYMENT_REQUESTED: "Yêu cầu thanh toán",
  CHECKOUT: "Đang thanh toán",
  CLEANING: "Đang dọn dẹp",
  DISABLED: "Ngưng sử dụng",
};

export const TABLE_STATUS_TONE: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  AVAILABLE: "secondary",
  OCCUPIED: "default",
  ORDERING: "default",
  WAITING_FOOD: "default",
  DINING: "default",
  PAYMENT_REQUESTED: "destructive",
  CHECKOUT: "destructive",
  CLEANING: "outline",
  DISABLED: "outline",
};

export const REQUEST_TYPE_LABEL: Record<string, string> = {
  CALL_STAFF: "Gọi phục vụ",
  WATER: "Xin thêm nước",
  UTENSILS: "Xin dụng cụ",
  ITEM_SUPPORT: "Gọi món hỗ trợ",
  OTHER: "Khác",
};

export const REQUEST_STATUS_LABEL: Record<string, string> = {
  NEW: "Mới",
  ACCEPTED: "Đã nhận",
  COMPLETED: "Hoàn tất",
  CANCELLED: "Đã huỷ",
};

export const AUDIT_ACTION_LABEL: Record<string, string> = {
  LOGIN: "Đăng nhập",
  OPEN_TABLE: "Mở bàn",
  CREATE_ORDER: "Tạo đơn hàng",
  ORDER_PREPARING: "Bếp nhận món",
  ORDER_READY: "Món sẵn sàng",
  ORDER_SERVED: "Đã phục vụ",
  ORDER_CANCELLED: "Huỷ đơn hàng",
  CANCEL_ORDER_ITEM: "Huỷ món",
  REQUEST_PAYMENT: "Yêu cầu thanh toán",
  TRANSFER_TABLE: "Chuyển bàn",
  APPLY_DISCOUNT: "Áp dụng giảm giá",
  PAYMENT_COMPLETED: "Thanh toán hoàn tất",
  VOID_PAYMENT: "Huỷ giao dịch",
  CREATE_REQUEST: "Khách gửi yêu cầu",
  REQUEST_ACCEPTED: "Nhận yêu cầu",
  REQUEST_COMPLETED: "Hoàn tất yêu cầu",
  CREATE_MENU_ITEM: "Thêm món mới",
  MENU_PRICE_CHANGE: "Đổi giá món",
  SOLD_OUT_CHANGE: "Đổi trạng thái hết hàng",
  QR_REGENERATE: "Tạo lại mã QR",
  CREATE_TABLE: "Thêm bàn",
  UPDATE_TABLE: "Cập nhật bàn",
  CREATE_USER: "Thêm người dùng",
  USER_ROLE_CHANGE: "Đổi vai trò",
  USER_ACTIVATED: "Kích hoạt tài khoản",
  USER_DEACTIVATED: "Vô hiệu hoá tài khoản",
  RESET_PASSWORD: "Đặt lại mật khẩu",
  TABLE_CLEANED: "Dọn bàn xong",
  SEED: "Khởi tạo dữ liệu demo",
  UPDATE_SETTINGS: "Cập nhật cài đặt",
};

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  CASH: "Tiền mặt",
  BANK_TRANSFER: "Chuyển khoản",
  CARD: "Thẻ/POS",
  E_WALLET: "Ví điện tử",
  OTHER: "Khác",
};
