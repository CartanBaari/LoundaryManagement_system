import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../hooks/useNotifications';
import {
  LayoutDashboard,
  ShoppingCart,
  Sparkles,
  Tags,
  Users,
  Briefcase,
  CreditCard,
  Truck,
  Boxes,
  FileText,
  Bell,
  Settings,
  ChevronRight,
  X,
} from 'lucide-react';

const menuGroupsByRole = {
  admin: [
    {
      items: [
        { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
        { label: 'Reports', icon: FileText, path: '/reports' },
      ],
    },
    {
      items: [
        { label: 'Orders', icon: ShoppingCart, path: '/orders' },
        { label: 'Users', icon: Users, path: '/users' },
        { label: 'Services', icon: Sparkles, path: '/services' },
        { label: 'Categories', icon: Tags, path: '/items-categories' },
        { label: 'Customers', icon: Users, path: '/customers' },
        { label: 'Staff', icon: Briefcase, path: '/staff' },
      ],
    },
    {
      items: [
        { label: 'Payments', icon: CreditCard, path: '/payments' },
        { label: 'Pickup & Delivery', icon: Truck, path: '/pickup-delivery' },
        { label: 'Inventory', icon: Boxes, path: '/inventory' },
        { label: 'Notifications', icon: Bell, path: '/notifications' },
      ],
    },
    {
      title: 'System',
      items: [{ label: 'Settings', icon: Settings, path: '/settings' }],
    },
  ],
  staff: [
    {
      
      items: [
        { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
        { label: 'Orders', icon: ShoppingCart, path: '/orders' },
      ],
    },
    {
      
      items: [
        { label: 'Pickup & Delivery', icon: Truck, path: '/pickup-delivery' },
        { label: 'Inventory', icon: Boxes, path: '/inventory' },
        { label: 'Notifications', icon: Bell, path: '/notifications' },
      ],
    },
    {
      title: 'System',
      items: [{ label: 'Settings', icon: Settings, path: '/settings' }],
    },
  ],
  client: [
    {
   
      items: [
        { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
        { label: 'Orders', icon: ShoppingCart, path: '/orders' },
      ],
    },
    {
      items: [
        { label: 'Payments', icon: CreditCard, path: '/payments' },
        { label: 'Notifications', icon: Bell, path: '/notifications' },
      ],
    },
    {
      title: 'System',
      items: [{ label: 'Settings', icon: Settings, path: '/settings' }],
    },
  ],
};

const Sidebar = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const location = useLocation();
  const { unreadCount } = useNotifications({ autoFetch: true, limit: 20, refreshInterval: 30000 });

  const groups = menuGroupsByRole[user?.role] || menuGroupsByRole.client;

  const isActivePath = (path) =>
    location.pathname === path || (path !== '/dashboard' && location.pathname.startsWith(`${path}/`));

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-950/35 backdrop-blur-[1px] md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[290px] flex-col border-r border-slate-200 bg-white transition-transform duration-300 md:static md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-6">
          <div>
            <h2 className="text-[2rem] font-bold tracking-tight text-[#1e4aa7]">LaundryHub</h2>
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-400">
              Admin Console
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100 md:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-6">
          <nav className="space-y-7">
            {groups.map((group) => (
              <div key={group.title}>
                <p className="px-3 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  {group.title}
                </p>
                <div className="mt-3 space-y-1.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = isActivePath(item.path);

                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={onClose}
                        className={`group flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-medium transition-all ${
                          active
                            ? 'bg-gradient-to-r from-[#1e4aa7] to-[#38BDF8] text-white shadow-[0_12px_30px_rgba(56,189,248,0.22)]'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        <Icon className={`h-5 w-5 ${active ? 'text-white' : 'text-slate-500'}`} />
                        <span className="flex-1">{item.label}</span>
                        {item.path === '/notifications' && unreadCount > 0 && (
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              active ? 'bg-white/20 text-white' : 'bg-red-100 text-red-600'
                            }`}
                          >
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </span>
                        )}
                        <ChevronRight
                          className={`h-4 w-4 transition-transform ${
                            active ? 'translate-x-0 text-white/85' : 'text-slate-300 group-hover:text-slate-500'
                          }`}
                        />
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        <div className="border-t border-slate-200 p-5">
          <div className="rounded-3xl bg-gradient-to-r from-[#1e4aa7] to-[#38BDF8] p-5 text-white shadow-[0_16px_40px_rgba(30,74,167,0.22)]">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/80">
              Current Role
            </p>
            <p className="mt-2 text-xl font-semibold capitalize">{user?.role || 'User'}</p>
            <p className="mt-1 text-sm text-white/85">
              Signed in as {user?.name || 'LaundryHub operator'}
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
