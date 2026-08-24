import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '../context/CompanyContext';
import { useAuth } from '../context/AuthContext';
import { useTeam } from '../context/TeamContext';
import Avatar, { getDisplayName } from './Avatar';
import Badge from './Badge';
import {
  Search,
  Building2,
  Users2,
  Mail,
  User,
  LayoutDashboard,
  Settings,
  X,
  ChevronRight,
  SearchX,
} from 'lucide-react';

const GlobalSearch = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    company,
    companies = [],
    members = [],
    invitations = [],
    canManageCompany,
    selectCompany,
  } = useCompany();
  const { teams = [] } = useTeam();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Auto-focus input when search modal opens
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      const timer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Normalize search text
  const cleanQuery = query.trim().toLowerCase();

  // Filtered Teams
  const matchedTeams = useMemo(() => {
    if (!cleanQuery) return [];
    if (!Array.isArray(teams)) return [];

    return teams
      .filter((t) => {
        if (!t) return false;
        const name = (t.name || '').toLowerCase();
        const desc = (t.description || '').toLowerCase();
        return name.includes(cleanQuery) || desc.includes(cleanQuery);
      })
      .slice(0, 4);
  }, [teams, cleanQuery]);

  // Filtered Members
  const matchedMembers = useMemo(() => {
    if (!cleanQuery) return [];
    if (!Array.isArray(members)) return [];

    return members
      .filter((m) => {
        if (!m) return false;
        const fullName = (m.user?.full_name || m.full_name || '').toLowerCase();
        const username = (m.user?.username || m.username || '').toLowerCase();
        const email = (m.user?.email || m.email || '').toLowerCase();
        const designation = (m.designation || '').toLowerCase();
        const department = (m.department || '').toLowerCase();
        const role = (m.role || '').toLowerCase();

        return (
          fullName.includes(cleanQuery) ||
          username.includes(cleanQuery) ||
          email.includes(cleanQuery) ||
          designation.includes(cleanQuery) ||
          department.includes(cleanQuery) ||
          role.includes(cleanQuery)
        );
      })
      .slice(0, 5);
  }, [members, cleanQuery]);

  // Filtered Companies
  const matchedCompanies = useMemo(() => {
    if (!cleanQuery) return [];
    if (!Array.isArray(companies)) return [];

    return companies
      .filter((c) => {
        if (!c) return false;
        const name = (c.name || '').toLowerCase();
        const domain = (c.domain || '').toLowerCase();
        return name.includes(cleanQuery) || domain.includes(cleanQuery);
      })
      .slice(0, 3);
  }, [companies, cleanQuery]);

  // Filtered Invitations
  const matchedInvitations = useMemo(() => {
    if (!cleanQuery) return [];
    if (!Array.isArray(invitations)) return [];

    return invitations
      .filter((inv) => {
        if (!inv) return false;
        const email = (inv.email || '').toLowerCase();
        const role = (inv.role || '').toLowerCase();
        const status = (inv.status || '').toLowerCase();
        const designation = (inv.designation || '').toLowerCase();
        const department = (inv.department || '').toLowerCase();

        return (
          email.includes(cleanQuery) ||
          role.includes(cleanQuery) ||
          status.includes(cleanQuery) ||
          designation.includes(cleanQuery) ||
          department.includes(cleanQuery)
        );
      })
      .slice(0, 4);
  }, [invitations, cleanQuery]);

  // Quick Action Links when query is empty
  const quickLinks = useMemo(() => {
    return [
      {
        id: 'quick-dashboard',
        type: 'QUICK_LINK',
        title: 'Dashboard',
        subtitle: 'Overview & key workspace metrics',
        icon: LayoutDashboard,
        action: () => navigate('/dashboard'),
      },
      {
        id: 'quick-company',
        type: 'QUICK_LINK',
        title: 'Company & Workspaces',
        subtitle: 'Organization details and management',
        icon: Building2,
        action: () => navigate('/company'),
      },
      {
        id: 'quick-teams',
        type: 'QUICK_LINK',
        title: 'Teams',
        subtitle: 'Focused collaboration teams',
        icon: Users2,
        action: () => navigate('/teams'),
      },
      {
        id: 'quick-members',
        type: 'QUICK_LINK',
        title: 'Members Directory',
        subtitle: 'Team members and organization roster',
        icon: User,
        action: () => navigate('/company?tab=members'),
      },
      {
        id: 'quick-invitations',
        type: 'QUICK_LINK',
        title: 'Pending Invitations',
        subtitle: 'View and manage workspace invites',
        icon: Mail,
        action: () => navigate('/company?tab=invitations'),
      },
      {
        id: 'quick-settings',
        type: 'QUICK_LINK',
        title: 'Account Settings',
        subtitle: 'Security, preferences, and appearance',
        icon: Settings,
        action: () => navigate('/settings'),
      },
    ];
  }, [navigate]);

  // Flatten active search results
  const flattenedResults = useMemo(() => {
    if (!cleanQuery) {
      return quickLinks;
    }

    const items = [];

    matchedTeams.forEach((t) => {
      items.push({
        id: `team-${t.id}`,
        type: 'TEAM',
        title: t.name,
        subtitle: t.description || 'Workspace Team',
        data: t,
        action: () => navigate(`/teams/${t.id}`),
      });
    });

    matchedMembers.forEach((m) => {
      const memberUser = m.user || m;
      items.push({
        id: `member-${m.id || memberUser.id}`,
        type: 'MEMBER',
        title: getDisplayName(memberUser),
        subtitle: memberUser.email,
        data: m,
        action: () => navigate('/company?tab=members'),
      });
    });

    matchedCompanies.forEach((c) => {
      items.push({
        id: `company-${c.id}`,
        type: 'COMPANY',
        title: c.name,
        subtitle: c.domain ? `${c.domain} · Active Workspace` : 'TeamX Workspace',
        data: c,
        action: () => {
          if (c.id !== company?.id) {
            selectCompany(c);
          }
          navigate('/company');
        },
      });
    });

    matchedInvitations.forEach((inv) => {
      items.push({
        id: `inv-${inv.id}`,
        type: 'INVITATION',
        title: inv.email,
        subtitle: `Role: ${inv.role} · Status: ${inv.status}`,
        data: inv,
        action: () => navigate('/company?tab=invitations'),
      });
    });

    return items;
  }, [
    cleanQuery,
    quickLinks,
    matchedTeams,
    matchedMembers,
    matchedCompanies,
    matchedInvitations,
    navigate,
    company?.id,
    selectCompany,
  ]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < flattenedResults.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : flattenedResults.length - 1
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = flattenedResults[selectedIndex];
        if (selected && selected.action) {
          selected.action();
          onClose();
        }
      }
    },
    [isOpen, flattenedResults, selectedIndex, onClose]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!isOpen) return null;

  const totalResultsCount =
    matchedTeams.length + matchedMembers.length + matchedCompanies.length + matchedInvitations.length;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6 md:p-20 flex items-start justify-center animate-fade-in">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/50 dark:bg-slate-950/75 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div
        className="relative w-full max-w-2xl transform overflow-hidden rounded-xl bg-white dark:bg-[#151F32] border border-slate-200/80 dark:border-[#263449] shadow-2xl transition-all animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="relative flex items-center border-b border-slate-200/80 dark:border-[#263449] px-4">
          <Search className="h-4 w-4 text-slate-400 dark:text-[#94A3B8] shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search teams, members, companies, invitations..."
            className="h-12 w-full bg-transparent text-sm text-slate-900 dark:text-[#F8FAFC] placeholder:text-slate-400 dark:placeholder:text-[#64748B] focus:outline-none"
            aria-label="Search TeamX workspace"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 rounded-md text-slate-400 dark:text-[#94A3B8] hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#202D43] transition-colors mr-2 cursor-pointer"
              title="Clear search query"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-2 py-0.5 rounded-md text-[10px] font-mono text-slate-500 dark:text-[#94A3B8] bg-slate-100 dark:bg-[#1B263A] border border-slate-200 dark:border-[#263449] hover:bg-slate-200 dark:hover:bg-[#202D43] transition-colors cursor-pointer"
          >
            ESC
          </button>
        </div>

        {/* Results Container */}
        <div ref={listRef} className="max-h-96 overflow-y-auto p-3 space-y-4">
          {/* EMPTY QUERY: Show Quick Links & Hints */}
          {!cleanQuery && (
            <div className="space-y-3">
              <div className="px-2 text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-[#94A3B8] font-mono">
                Quick Navigation
              </div>
              <div className="space-y-1">
                {quickLinks.map((item, idx) => {
                  const Icon = item.icon;
                  const isSelected = selectedIndex === idx;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        item.action();
                        onClose();
                      }}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-500/30 text-indigo-900 dark:text-indigo-200'
                          : 'text-slate-700 dark:text-[#CBD5E1] hover:bg-slate-50 dark:hover:bg-[#202D43] border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`p-1.5 rounded-lg border ${
                            isSelected
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-slate-100 dark:bg-[#1B263A] text-slate-500 dark:text-[#94A3B8] border-slate-200 dark:border-[#263449]'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-900 dark:text-[#F8FAFC] truncate">
                            {item.title}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] truncate">
                            {item.subtitle}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-slate-400 dark:text-[#94A3B8] shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* QUERY HAS NO RESULTS */}
          {cleanQuery && totalResultsCount === 0 && (
            <div className="py-10 text-center space-y-2">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 dark:bg-[#1B263A] text-slate-400 dark:text-[#94A3B8] border border-slate-200 dark:border-[#263449] mx-auto">
                <SearchX className="h-5 w-5" />
              </div>
              <p className="text-xs font-semibold text-slate-900 dark:text-[#F8FAFC]">
                No results found for &ldquo;{query}&rdquo;
              </p>
              <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] max-w-sm mx-auto">
                Try searching by team, member name, email, company, role, or department.
              </p>
            </div>
          )}

          {/* QUERY HAS RESULTS */}
          {cleanQuery && totalResultsCount > 0 && (
            <div className="space-y-4">
              
              {/* CATEGORY 0: TEAMS */}
              {matchedTeams.length > 0 && (
                <div className="space-y-1.5">
                  <div className="px-2 text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-[#94A3B8] font-mono flex items-center justify-between">
                    <span>Teams ({matchedTeams.length})</span>
                    <span>Collaboration Groups</span>
                  </div>

                  <div className="space-y-1">
                    {matchedTeams.map((t) => {
                      const globalIdx = flattenedResults.findIndex(
                        (item) => item.id === `team-${t.id}`
                      );
                      const isSelected = selectedIndex === globalIdx;

                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            navigate(`/teams/${t.id}`);
                            onClose();
                          }}
                          onMouseEnter={() => setSelectedIndex(globalIdx)}
                          className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-500/30'
                              : 'hover:bg-slate-50 dark:hover:bg-[#202D43] border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20 shrink-0">
                              <Users2 className="h-3.5 w-3.5" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs font-semibold text-slate-900 dark:text-[#F8FAFC] block truncate">
                                {t.name}
                              </span>
                              <span className="text-[11px] text-slate-500 dark:text-[#94A3B8] truncate block">
                                {t.description || 'Workspace Team'}
                              </span>
                            </div>
                          </div>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-medium bg-slate-100 dark:bg-[#1B263A] text-slate-600 dark:text-[#CBD5E1] border border-slate-200 dark:border-[#263449]">
                            {t.member_count || 1} members
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* CATEGORY 1: MEMBERS */}
              {matchedMembers.length > 0 && (
                <div className="space-y-1.5">
                  <div className="px-2 text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-[#94A3B8] font-mono flex items-center justify-between">
                    <span>Members ({matchedMembers.length})</span>
                    <span>Workspace Roster</span>
                  </div>

                  <div className="space-y-1">
                    {matchedMembers.map((m) => {
                      const memberUser = m.user || m;
                      const globalIdx = flattenedResults.findIndex(
                        (item) => item.id === `member-${m.id || memberUser.id}`
                      );
                      const isSelected = selectedIndex === globalIdx;

                      return (
                        <button
                          key={m.id || memberUser.id}
                          type="button"
                          onClick={() => {
                            navigate('/company?tab=members');
                            onClose();
                          }}
                          onMouseEnter={() => setSelectedIndex(globalIdx)}
                          className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-500/30'
                              : 'hover:bg-slate-50 dark:hover:bg-[#202D43] border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar user={memberUser} size="xs" />
                            <div className="min-w-0">
                              <span className="text-xs font-semibold text-slate-900 dark:text-[#F8FAFC] block truncate">
                                {getDisplayName(memberUser)}
                              </span>
                              <span className="text-[11px] text-slate-500 dark:text-[#94A3B8] font-mono truncate block">
                                {memberUser.email}
                              </span>
                            </div>
                          </div>
                          <Badge variant="neutral" size="xs" className="shrink-0">
                            {m.role || 'MEMBER'}
                          </Badge>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* CATEGORY 2: WORKSPACES */}
              {matchedCompanies.length > 0 && (
                <div className="space-y-1.5">
                  <div className="px-2 text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-[#94A3B8] font-mono flex items-center justify-between">
                    <span>Workspaces ({matchedCompanies.length})</span>
                    <span>Organizations</span>
                  </div>

                  <div className="space-y-1">
                    {matchedCompanies.map((c) => {
                      const globalIdx = flattenedResults.findIndex(
                        (item) => item.id === `company-${c.id}`
                      );
                      const isSelected = selectedIndex === globalIdx;

                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            if (c.id !== company?.id) {
                              selectCompany(c);
                            }
                            navigate('/company');
                            onClose();
                          }}
                          onMouseEnter={() => setSelectedIndex(globalIdx)}
                          className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-500/30'
                              : 'hover:bg-slate-50 dark:hover:bg-[#202D43] border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-[#1B263A] text-slate-600 dark:text-[#CBD5E1] border border-slate-200 dark:border-[#263449] shrink-0">
                              <Building2 className="h-3.5 w-3.5" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs font-semibold text-slate-900 dark:text-[#F8FAFC] block truncate">
                                {c.name}
                              </span>
                              <span className="text-[11px] text-slate-500 dark:text-[#94A3B8] font-mono truncate block">
                                {c.domain || 'teamx.local'}
                              </span>
                            </div>
                          </div>
                          {c.id === company?.id && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-medium bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                              Current
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* CATEGORY 3: INVITATIONS */}
              {matchedInvitations.length > 0 && (
                <div className="space-y-1.5">
                  <div className="px-2 text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-[#94A3B8] font-mono flex items-center justify-between">
                    <span>Invitations ({matchedInvitations.length})</span>
                    <span>Authorized</span>
                  </div>

                  <div className="space-y-1">
                    {matchedInvitations.map((inv) => {
                      const globalIdx = flattenedResults.findIndex(
                        (item) => item.id === `inv-${inv.id}`
                      );
                      const isSelected = selectedIndex === globalIdx;

                      return (
                        <button
                          key={inv.id}
                          type="button"
                          onClick={() => {
                            navigate('/company?tab=invitations');
                            onClose();
                          }}
                          onMouseEnter={() => setSelectedIndex(globalIdx)}
                          className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-500/30'
                              : 'hover:bg-slate-50 dark:hover:bg-[#202D43] border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 shrink-0">
                              <Mail className="h-3.5 w-3.5" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs font-semibold text-slate-900 dark:text-[#F8FAFC] font-mono block truncate">
                                {inv.email}
                              </span>
                              <span className="text-[11px] text-slate-500 dark:text-[#94A3B8] font-mono truncate block">
                                Role: {inv.role} &bull; Status: {inv.status}
                              </span>
                            </div>
                          </div>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-medium bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
                            {inv.status}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>

        {/* Footer Shortcut Guide */}
        <div className="border-t border-slate-100 dark:border-[#263449] bg-slate-50/80 dark:bg-[#1B263A]/50 px-4 py-2 flex items-center justify-between text-[11px] text-slate-400 dark:text-[#94A3B8] font-mono">
          <div className="flex items-center gap-3">
            <span>&uarr;&darr; Navigate</span>
            <span>&crarr; Open</span>
            <span>ESC Close</span>
          </div>
          <span>TeamX Global Search</span>
        </div>
      </div>
    </div>
  );
};

export default GlobalSearch;
