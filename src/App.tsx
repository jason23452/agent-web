import { AppRouter } from "@/app/AppRouter"
import { ToastProvider } from "@/shared/components/ui/toast"

export default function App() {
  return (
    <ToastProvider position="top-center">
      <AppRouter />
    </ToastProvider>
  )
}
