import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { motion } from "framer-motion"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { User, Mail, Lock, Phone, MapPin, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
  phone: z.string().optional(),
  address: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
})

export default function Register() {
  const [loading, setLoading] = useState(false)
  const { register: registerUser } = useAuth()
  const navigate = useNavigate()

  const form = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      phone: "",
      address: "",
    },
  })

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      const { confirmPassword: _confirmPassword, ...payload } = data
      void _confirmPassword
      await registerUser({ ...payload, role: "client" })
      toast.success("Account created successfully!")
      navigate("/dashboard")
    } catch (error) {
      toast.error(error.response?.data?.message || "Registration failed")
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
              <CardTitle className="text-2xl">Create your account</CardTitle>
              <CardDescription>Join LaundryHub to manage your laundry services</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input className="pl-9" placeholder="John Doe" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
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
                )} />
                <FormField control={form.control} name="password" render={({ field }) => (
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
                )} />
                <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input className="pl-9" type="password" placeholder="••••••••" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone (Optional)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input className="pl-9" placeholder="+1234567890" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="address" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address (Optional)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input className="pl-9" placeholder="123 Main St" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="submit" className="mt-2 w-full" loading={loading}>Create Account</Button>
              </form>
            </Form>

            <p className="mt-6 text-center text-sm font-medium text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="font-semibold text-primary hover:text-primary-hover">Sign in</Link>
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
