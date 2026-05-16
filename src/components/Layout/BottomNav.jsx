import { NavLink } from 'react-router-dom'

const NAV = [
  { to: '/dashboard', label: 'Home',     icon: '⌂'  },
  { to: '/book',      label: 'Book',     icon: '+'   },
  { to: '/explore',   label: 'Explore',  icon: '✦'  },
  { to: '/bookings',  label: 'Bookings', icon: '◷'  },
  { to: '/profile',   label: 'Profile',  icon: '○'  },
]

export default function BottomNav() {
  return (
    <nav className="cp-bottom-nav" aria-label="Main navigation">
      {NAV.map(({ to, icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) => `cp-nav-item${isActive ? ' active' : ''}`}
        >
          <span className="cp-nav-icon" aria-hidden="true">{icon}</span>
          <span className="cp-nav-label">{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
