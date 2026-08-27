import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '../context/CompanyContext';
import { useAuth } from '../context/AuthContext';
import { useTeam } from '../context/TeamContext';
import { useProject } from '../context/ProjectContext';
import { useTask } from '../context/TaskContext';
import Avatar, { getDisplayName } from './Avatar';
import Badge from './Badge';
import {
  Search,
  Building2,
  Users2,
  FolderKanban,
  CheckSquare,
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
    selectCompany,
  } = useCompany();
  const { teams = [] } = useTeam();
  const { projects = [] } = useProject();
  const { myTasks = [] } = useTask();

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

  // Filtered Tasks
  const matchedTasks = useMemo(() => {
    if (!cleanQuery) return [];
    if (!Array.isArray(myTasks)) return [];

    return myTasks
      .filter((t) => {
        if (!t) return false;
        const title = (t.title || '').toLowerCase();
        const desc = (t.description || '').toLowerCase();
        const proj = (t.project?.name || '').toLowerCase();
        return title.includes(cleanQuery) || desc.includes(cleanQuery) || proj.includes(cleanQuery);
      })
      .slice(0, 4);
  }, [myTasks, cleanQuery]);

  // Filtered Projects
  const matchedProjects = useMemo(() => {
    if (!cleanQuery) return [];
    if (!Array.isArray(projects)) return [];

    return projects
      .filter((p) => {
        if (!p) return false;
        const name = (p.name || '').toLowerCase();
        const desc = (p.description || '').toLowerCase();
        return name.includes(cleanQuery) || desc.includes(cleanQuery);
      })
      .slice(0, 4);
  }, [projects, cleanQuery]);

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
      .slice(0, 4);
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
      .slice(0, 3);
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
        id: 'quick-teams',
        type: 'QUICK_LINK',
        title: 'Teams',
        subtitle: 'Focused collaboration teams',
        icon: Users2,
        action: () => navigate('/teams'),
      },
      {
        id: 'quick-projects',
        type: 'QUICK_LINK',
        title: 'Projects',
        subtitle: 'Initiatives and deliverables',
        icon: FolderKanban,
        action: () => navigate('/projects'),
      },
      {
        id: 'quick-tasks',
        type: 'QUICK_LINK',
        title: 'Tasks',
        subtitle: 'Track work assigned to you',
        icon: CheckSquare,
        action: () => navigate('/tasks'),
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
        id: 'quick-settings',
        type: 'QUICK_LINK',
        title: 'Settings',
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

    matchedTasks.forEach((t) => {
      items.push({
        id: `task-${t.id}`,
        type: 'TASK',
        title: t.title,
        subtitle: t.project?.name ? `${t.project.name} · Priority: ${t.priority}` : `Priority: ${t.priority}`,
        data: t,
        action: () => {
          if (t.project?.id) {
            navigate(`/projects/${t.project.id}`);
          } else {
            navigate('/tasks');
          }
        },
      });
    });

    matchedProjects.forEach((p) => {
      items.push({
        id: `project-${p.id}`,
        type: 'PROJECT',
        title: p.name,
        subtitle: p.description || 'Workspace Project',
        data: p,
        action: () => navigate(`/projects/${p.id}`),
      });
    });

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
    matchedTasks,
    matchedProjects,
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
        if (flattenedResults[selectedIndex]) {
          flattenedResults[selectedIndex].action();
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

  const totalMatches =
    matchedTasks.length +
    matchedProjects.length +
    matchedTeams.length +
    matchedMembers.length +
    matchedCompanies.length +
    matchedInvitations.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-950/50 dark:bg-slate-950/75 backdrop-blur-[2px] animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white dark:bg-[#131D2E] rounded-2xl border border-slate-200/90 dark:border-[#263449] shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="relative flex items-center px-4 py-3 border-b border-slate-200/80 dark:border-[#202C3F] bg-slate-50/50 dark:bg-[#101726]/50">
          <Search className="h-4 w-4 text-slate-400 shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search tasks, projects, teams, people..."
            className="w-full bg-transparent text-sm text-slate-900 dark:text-[#F8FAFC] placeholder-slate-400 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded cursor-pointer mr-1"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-slate-400 dark:text-[#64748B] bg-slate-100 dark:bg-[#1B283F] border border-slate-200 dark:border-[#243247] rounded shadow-2xs">
            ESC
          </kbd>
        </div>

        {/* Results Area */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-2 space-y-3">
          {!cleanQuery ? (
            /* Quick Links View */
            <div className="space-y-1">
              <div className="px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-[#8292A9] font-mono">
                Quick Navigation
              </div>
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
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200 shadow-2xs'
                        : 'hover:bg-slate-50 dark:hover:bg-[#182337] text-slate-700 dark:text-[#CBD5E1]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-[#1B283F] text-slate-500 dark:text-[#94A3B8] shrink-0">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-semibold block truncate">
                          {item.title}
                        </span>
                        <span className="text-[11px] text-slate-400 dark:text-[#8292A9] truncate block">
                          {item.subtitle}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  </button>
                );
              })}
            </div>
          ) : totalMatches === 0 ? (
            /* No Results Found */
            <div className="py-12 text-center space-y-2">
              <SearchX className="h-8 w-8 mx-auto text-slate-400 dark:text-[#64748B]" />
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-slate-800 dark:text-[#F8FAFC]">
                  No results for &quot;{query}&quot;
                </p>
                <p className="text-[11px] text-slate-400 dark:text-[#8292A9]">
                  Check the spelling or try searching with another keyword.
                </p>
              </div>
            </div>
          ) : (
            /* Categorized Search Results */
            <div className="space-y-3">
              {/* TASKS */}
              {matchedTasks.length > 0 && (
                <div className="space-y-1">
                  <div className="px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-[#8292A9] font-mono">
                    Tasks ({matchedTasks.length})
                  </div>
                  {matchedTasks.map((t) => {
                    const globalIdx = flattenedResults.findIndex(
                      (item) => item.id === `task-${t.id}`
                    );
                    const isSelected = selectedIndex === globalIdx;

                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          if (t.project?.id) {
                            navigate(`/projects/${t.project.id}`);
                          } else {
                            navigate('/tasks');
                          }
                          onClose();
                        }}
                        onMouseEnter={() => setSelectedIndex(globalIdx)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-50 dark:bg-indigo-950/60 shadow-2xs'
                            : 'hover:bg-slate-50 dark:hover:bg-[#182337]'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shrink-0">
                            <CheckSquare className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-semibold text-slate-900 dark:text-[#F8FAFC] block truncate">
                              {t.title}
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-[#94A3B8] truncate block">
                              {t.project?.name ? `${t.project.name} · ` : ''}
                              Status: {t.status}
                            </span>
                          </div>
                        </div>
                        <Badge
                          variant={t.priority === 'URGENT' ? 'error' : t.priority === 'HIGH' ? 'warning' : 'neutral'}
                          size="xs"
                        >
                          {t.priority}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* PROJECTS */}
              {matchedProjects.length > 0 && (
                <div className="space-y-1">
                  <div className="px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-[#8292A9] font-mono">
                    Projects ({matchedProjects.length})
                  </div>
                  {matchedProjects.map((p) => {
                    const globalIdx = flattenedResults.findIndex(
                      (item) => item.id === `project-${p.id}`
                    );
                    const isSelected = selectedIndex === globalIdx;

                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          navigate(`/projects/${p.id}`);
                          onClose();
                        }}
                        onMouseEnter={() => setSelectedIndex(globalIdx)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-50 dark:bg-indigo-950/60 shadow-2xs'
                            : 'hover:bg-slate-50 dark:hover:bg-[#182337]'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shrink-0">
                            <FolderKanban className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-semibold text-slate-900 dark:text-[#F8FAFC] block truncate">
                              {p.name}
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-[#94A3B8] truncate block">
                              {p.description || 'Workspace Project'}
                            </span>
                          </div>
                        </div>
                        <Badge
                          variant={p.status === 'ACTIVE' ? 'success' : 'neutral'}
                          size="xs"
                        >
                          {p.status}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* TEAMS */}
              {matchedTeams.length > 0 && (
                <div className="space-y-1">
                  <div className="px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-[#8292A9] font-mono">
                    Teams ({matchedTeams.length})
                  </div>
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
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-50 dark:bg-indigo-950/60 shadow-2xs'
                            : 'hover:bg-slate-50 dark:hover:bg-[#182337]'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shrink-0">
                            <Users2 className="h-4 w-4" />
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
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-slate-100 dark:bg-[#1B283F] text-slate-600 dark:text-[#CBD5E1]">
                          {t.member_count || 1} members
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* PEOPLE / MEMBERS */}
              {matchedMembers.length > 0 && (
                <div className="space-y-1">
                  <div className="px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-[#8292A9] font-mono">
                    People ({matchedMembers.length})
                  </div>
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
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-50 dark:bg-indigo-950/60 shadow-2xs'
                            : 'hover:bg-slate-50 dark:hover:bg-[#182337]'
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
                        <Badge variant="neutral" size="xs">
                          {m.role || 'MEMBER'}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Shortcut Legend */}
        <div className="px-4 py-2 border-t border-slate-200/80 dark:border-[#202C3F] bg-slate-50/50 dark:bg-[#101726]/50 flex items-center justify-between text-[11px] text-slate-400 dark:text-[#64748B]">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
          <span className="font-mono">TeamX Search</span>
        </div>
      </div>
    </div>
  );
};

export default GlobalSearch;
