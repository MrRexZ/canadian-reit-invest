import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { LogOut } from 'lucide-react'

type UserDropdownProps = {
  // default: small circular icon trigger; sidebar: full-width with name/email shown when expanded
  variant?: 'default' | 'sidebar'
}

export function UserDropdown({ variant = 'default' }: UserDropdownProps) {
  const { user, signOut } = useAuth()

  if (!user) return null

  const handleSignOut = async () => {
    await signOut()
  }

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase()
  }

  const displayName =
    // prefer common supabase user_metadata fields if present
    ((user as any)?.user_metadata?.full_name as string | undefined) ||
    ((user as any)?.user_metadata?.name as string | undefined) ||
    (user.email ? user.email.split('@')[0] : 'User')

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {variant === 'sidebar' ? (
          <Button
            variant="outline"
            className="h-9 w-full justify-start gap-2 rounded-md px-2 group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:p-0"
          >
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-primary-foreground">
                {getInitials(user.email || 'U')}
              </AvatarFallback>
            </Avatar>
            {/* Details visible only when expanded */}
            <div className="min-w-0 text-left group-data-[collapsible=icon]:hidden">
              <p className="truncate text-sm font-medium leading-none">{displayName}</p>
            </div>
          </Button>
        ) : (
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-primary-foreground">
                {getInitials(user.email || 'U')}
              </AvatarFallback>
            </Avatar>
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">Account</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}