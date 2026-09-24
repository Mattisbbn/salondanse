export default defineAppConfig({
  ui: {
    colors: {
      primary: 'brique',
      neutral: 'stone'
    },
    button: {
      defaultVariants: {
        size: 'sm'
      },
      slots: {
        base: 'font-semibold rounded-full cursor-pointer transition-colors shadow-none'
      }
    },
    badge: {
      defaultVariants: {
        variant: 'solid'
      },
      slots: {
        base: 'font-semibold tracking-normal inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs'
      }
    },
    input: {
      slots: {
        base: 'rounded-xl border-[#D8C6B4] focus:border-[#7A291E] focus:ring-[#7A291E]'
      }
    },
    select: {
      slots: {
        base: 'rounded-xl border-[#D8C6B4] focus:border-[#7A291E] focus:ring-[#7A291E]'
      }
    },
    card: {
      slots: {
        root: 'bg-[#FFFCF8] border border-[#E6D9CB] rounded-2xl shadow-none'
      }
    }
  }
})
