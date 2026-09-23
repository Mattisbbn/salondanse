export default defineAppConfig({
  ui: {
    colors: {
      primary: 'violet',
      neutral: 'slate'
    },
    badge: {
      defaultVariants: {
        variant: 'solid'
      },
      slots: {
        base: 'font-semibold tracking-wide inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs shadow-2xs'
      }
    }
  }
})
