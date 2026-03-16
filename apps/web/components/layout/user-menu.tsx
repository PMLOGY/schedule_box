'use client';

import { useRouter } from '@/lib/i18n/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { useTranslations } from 'next-intl';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User, Settings, LogOut } from 'lucide-react';

export function UserMenu() {
  const router = useRouter();
  const t = useTranslations('nav');
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (!user) return null;

  const isCustomer = user.role === 'customer';
  const isAdmin = user.role === 'admin';
  const profilePath = isCustomer ? '/portal/profile' : '/profile';
  const showProfileLink = !isAdmin;
  const showSettingsLink = !isCustomer && !isAdmin;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-3 outline-none" aria-label="User menu">
        <Avatar>
          <AvatarFallback>{getInitials(user.firstName + ' ' + user.lastName)}</AvatarFallback>
        </Avatar>
        <div className="hidden text-left md:block">
          <div className="text-sm font-medium">
            {user.firstName} {user.lastName}
          </div>
          <div className="text-xs text-muted-foreground">{user.companyName}</div>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>{t('myAccount')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {showProfileLink && (
          <DropdownMenuItem onClick={() => router.push(profilePath)}>
            <User className="mr-2 h-4 w-4" />
            {t('profile')}
          </DropdownMenuItem>
        )}
        {showSettingsLink && (
          <DropdownMenuItem onClick={() => router.push('/settings')}>
            <Settings className="mr-2 h-4 w-4" />
            {t('settings')}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          {t('logout')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
