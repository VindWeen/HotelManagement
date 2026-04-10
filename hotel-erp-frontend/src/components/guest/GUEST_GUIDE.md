# The Ethereal Hotel — Guest Portal Guidelines

Tài liệu này hướng dẫn cách sử dụng bộ component dùng chung để xây dựng các trang mới cho **Guest Portal** (nền tảng dành cho khách hàng).

## 1. Cấu trúc Layout

> Mọi trang Guest đều đã được bọc bởi `GuestLayout` (chứa `GuestHeader` và `GuestFooter`). Các bạn chỉ cần code phần ruột (main content) của trang.

### Định nghĩa Route mới

Thêm route vào file `src/routes/GuestRoutes.jsx` (không thêm vào `AdminRoutes.jsx` nữa):

```jsx
const OffersPage = lazy(() => import("../pages/guest/OffersPage"));

// Trong hàm GuestRoutes():
<Route path="/offers" element={withSuspense(<OffersPage />)} />
```

## 2. Component Dùng Chung (`import { ... } from '../../components/guest'`)

### 2.1. `PageContainer`

Wrapper bắt buộc bọc ngoài các block content để tự động căn giữa và responsive:

```jsx
<PageContainer size="md">
  Nội dung căn giữa
</PageContainer>
```
- **size**: `'sm'` (640px), `'md'` (768px), `'lg'` (1200px - default), `'xl'` (1440px), `'full'` (full width).
- **padding**: `true` | `false` (bật tắt padding 2 bên màn hình).
- **as**: Ví dụ `as="section"` để semantic HTML.

### 2.2. `SectionTitle`

Tiêu đề chuyên dùng cho các section.

```jsx
<SectionTitle 
  eyebrow="Khuyến mãi" 
  title="Ưu đãi Đặc Biệt" 
  subtitle="Khám phá ngay..." 
  align="center" // 'left' hoặc 'center'
/>
```

### 2.3. Trạng thái (Loading, Error, Empty)

Nên luôn xử lý cả 3 trạng thái khi gọi API:

```jsx
// 1. Loading
if (loading) return <LoadingSpinner variant="skeleton" skeletonCount={4} />;
// Variants khác: <LoadingSpinner /> (xoay mặc định), <LoadingSpinner fullPage /> (chắn giữa màn hình)

// 2. Không có dữ liệu
if (items.length === 0) return <EmptyState icon="📦" title="Trống" message="Chưa có data" />;

// 3. Lỗi
if (error) return <ErrorState message={error.message} onRetry={fetchData} />;
```

### 2.4. `StatusBadge`

Badge hiển thị trạng thái (Thành công, Lỗi, Cảnh báo).

```jsx
<StatusBadge variant="success" dot={true}>Đã xác nhận</StatusBadge>
<StatusBadge variant="warning">Chờ thanh toán</StatusBadge>
```

### 2.5. Nút bấm (Buttons)

Sử dụng trực tiếp các class CSS được cung cấp sẵn (không cần component riêng):

```jsx
<button className="g-btn-primary">Hoàn tất</button>
<Link to="/booking" className="g-btn-gold">Đặt phòng</Link>
<button className="g-btn-outline">Hủy báo</button>
<button className="g-btn-ghost">Lưu lại</button>

<!-- Sizes -->
<button className="g-btn-primary g-btn-sm">Nhỏ</button>
<button className="g-btn-primary g-btn-lg">Lớn</button>
```

## 3. Class Tiện ích (CSS Utilities)

Các class phổ biến trong `guest.css`:

- **Bóng đổ & bo góc**:
  - `g-card`: Tạo card màu trắng, viền mờ, bo góc, có bóng đổ và trượt nhẹ khi hover.
- **Typo**:
  - `g-heading`: Ép font chữ Playfair Display cho tiêu đề con.
  - `g-label`: Nhãn dạng in hoa, khoảng cách xa.
  - `g-prose`: Thẻ wrapper chuyên dành cho nội dung HTML render từ Editor (tự style `p, h1, img...`).
- **Animations**:
  - `g-animate-fade`, `g-animate-up`, `g-animate-scale`
- **Helpers**:
  - `g-img-cover`: Hình ảnh fill đầy thẻ cha.
  - `g-section` / `g-section-lg`: padding cho từng đoạn trang.

---
**Happy coding!** Đội ngũ frontend, hãy theo đúng màu và khoảng cách trong `guest.css` để giao diện đồng nhất chuẩn 5 sao nhé.
