/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      // Chú ý: typography giờ là 1 hàm nhận theme
      typography: (theme) => ({
        DEFAULT: {
          css: {
            // đổi màu text chung
            color: theme('colors.black'),

            // đổi màu bullet/marker của <ul> và <ol>
            'ul > li::marker': {
              color: theme('colors.black'),
            },
            'ol > li::marker': {
              color: theme('colors.black'),
            },

            // giữ lại hoặc chỉnh sửa các thuộc tính khác
            fontSize: '1rem',
            lineHeight: '1.75',
            p: {
              marginTop: '1.25em',
              marginBottom: '1.25em',
            },
            'ul > li, ol > li': {
              paddingLeft: '1.75em',
            },
          },
        },
      }),
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
