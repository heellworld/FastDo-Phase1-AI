/**
 * Theme Configuration cho ứng dụng Davas Chatbot
 * Dựa trên nhận diện thương hiệu Fastdo
 */

export const THEME_CONFIG = {
  colors: {
    // Màu chính - dựa trên website Fastdo
    primary: {
      light: '#1e88e5',
      main: '#0d47a1', // Màu chủ đạo của Fastdo (xanh dương đậm)
      dark: '#002171',
      contrast: '#ffffff',
    },
    // Màu phụ - màu cam từ Fastdo
    secondary: {
      light: '#ff9e40',
      main: '#ff6d00', // Màu cam của Fastdo
      dark: '#c43c00',
      contrast: '#ffffff',
    },
    // Các màu bổ sung
    success: {
      light: '#4caf50',
      main: '#2e7d32',
      dark: '#1b5e20',
      contrast: '#ffffff',
    },
    error: {
      light: '#ef5350',
      main: '#d32f2f',
      dark: '#b71c1c',
      contrast: '#ffffff',
    },
    // Màu cho tin nhắn
    message: {
      user: {
        background: '#0d47a1', // Màu chính của Fastdo
        text: '#ffffff',
      },
      bot: {
        background: '#f7f9fc', // Màu nền nhẹ
        text: '#263238',
        border: '#e0e6ed',
      },
    },
  },
  // Các giá trị cho bóng đổ và bo góc
  shadows: {
    small: '0 2px 4px rgba(0, 0, 0, 0.1)',
    medium: '0 4px 8px rgba(0, 0, 0, 0.12)',
    large: '0 8px 16px rgba(0, 0, 0, 0.14)',
  },
  // Bo góc
  borderRadius: {
    small: '4px',
    medium: '8px',
    large: '12px',
    full: '9999px',
  },
  // Font và typography
  typography: {
    fontFamily: 'Roboto, system-ui, sans-serif',
    // Các kích thước font
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
    },
    // Độ đậm font
    fontWeight: {
      regular: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
  },
  // Giá trị kích thước cho giao diện
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
  },
  // Logo và ảnh
  assets: {
    logo: 'https://Fastdo.vn/wp-content/uploads/2024/08/logo-Fastdo.svg',
    favicon: 'https://Fastdo.vn/wp-content/uploads/2022/07/cropped-F-32x32.png',
  }
};

export default THEME_CONFIG; 