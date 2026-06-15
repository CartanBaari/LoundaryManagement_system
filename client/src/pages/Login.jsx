import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { motion } from "framer-motion"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Mail, Lock, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

export default function Login() {
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      await login(data.email, data.password)
      toast.success("Welcome back!")
      navigate("/dashboard")
    } catch (error) {
      toast.error(error.response?.data?.message || "Login failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F8FAFC] p-4">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-success/10 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative w-full max-w-md"
      >
        <Card className="border-border shadow-elevated">
          <CardHeader className="space-y-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[16px] bg-primary shadow-soft">
              <Sparkles className="h-7 w-7 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl">Welcome to LaundryHub</CardTitle>
              <CardDescription>Sign in to your laundry management dashboard</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input className="pl-9" placeholder="you@example.com" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input className="pl-9" type="password" placeholder="••••••••" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" loading={loading}>
                  Sign In
                </Button>
              </form>
            </Form>

            <p className="mt-6 text-center text-sm font-medium text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link to="/register" className="font-semibold text-primary hover:text-primary-hover">
                Create account
              </Link>
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
