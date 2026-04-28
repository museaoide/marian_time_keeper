import React, { useState, useEffect, useRef } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Play, Pause, Plus, Trash2, Calendar, Home, Download, Upload, Edit3 } from 'lucide-react';

const MarianStudyTracker = () => {
  // Inject Google Fonts and custom styles
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    const style = document.createElement('style');
    style.textContent = `
      .marian-serif {
        font-family: 'EB Garamond', serif;
        letter-spacing: 0.02em;
      }
      .mit-sans {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        letter-spacing: -0.01em;
      }
      .heading-font {
        font-family: 'EB Garamond', serif;
        font-weight: 600;
        letter-spacing: 0.03em;
      }
      .mono-font {
        font-family: 'Courier New', monospace;
        font-variant-numeric: tabular-nums;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(link);
      document.head.removeChild(style);
    };
  }, []);
  const [activities, setActivities] = useState([]);
  const [newActivityName, setNewActivityName] = useState('');
  const [view, setView] = useState('today'); // 'today' or 'history'
  const [calendarView, setCalendarView] = useState('month'); // 'day', 'week', 'month'
  const [selectedDate, setSelectedDate] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editMode, setEditMode] = useState(null); // 'add', 'replace', 'delete', or 'rename'
  const [editHours, setEditHours] = useState('0');
  const [editMinutes, setEditMinutes] = useState('0');
  const [editSeconds, setEditSeconds] = useState('0');
  const [showEditMenu, setShowEditMenu] = useState(null); // Track which activity's menu is open
  const [editName, setEditName] = useState(''); // For renaming activities
  const inputRef = useRef(null);

  // Load data from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('marianStudyTracker');
    if (saved) {
      const parsed = JSON.parse(saved);
      setActivities(parsed.activities || []);
    }
  }, []);

  // Save to localStorage whenever activities change
  useEffect(() => {
    localStorage.setItem('marianStudyTracker', JSON.stringify({ activities }));
  }, [activities]);

  // Update running timers every second
  useEffect(() => {
    const interval = setInterval(() => {
      setActivities(prev => prev.map(activity => {
        if (activity.isRunning) {
          return {
            ...activity,
            elapsed: activity.elapsed + 1
          };
        }
        return activity;
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.target.tagName === 'INPUT') return;
      
      if (e.key === 'n' || e.key === 'N') {
        inputRef.current?.focus();
      }
      if (e.key === ' ') {
        e.preventDefault();
        const runningActivity = activities.find(a => a.isRunning && isToday(a.date));
        if (runningActivity) {
          toggleTimer(runningActivity.id);
        }
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [activities]);

  // Close edit menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showEditMenu && !e.target.closest('.edit-menu-container')) {
        setShowEditMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEditMenu]);

  const isToday = (dateStr) => {
    const today = new Date().toDateString();
    const activityDate = new Date(dateStr).toDateString();
    return today === activityDate;
  };

  const getTodayActivities = () => {
    return activities.filter(a => isToday(a.date));
  };

  const addActivity = () => {
    if (!newActivityName.trim()) return;
    
    const newActivity = {
      id: Date.now(),
      name: newActivityName.trim(),
      elapsed: 0,
      isRunning: false,
      date: new Date().toISOString()
    };
    
    setActivities([...activities, newActivity]);
    setNewActivityName('');
  };

  const toggleTimer = (id) => {
    setActivities(prev => prev.map(activity => 
      activity.id === id 
        ? { ...activity, isRunning: !activity.isRunning }
        : activity
    ));
  };

  const deleteActivity = (id) => {
    setActivities(prev => prev.filter(a => a.id !== id));
  };

  const openEditModal = (id, mode) => {
    const activity = activities.find(a => a.id === id);
    setEditingId(id);
    setEditMode(mode);
    setEditHours('0');
    setEditMinutes('0');
    setEditSeconds('0');
    setEditName(activity?.name || ''); // Set current name for rename mode
    setShowEditMenu(null); // Close the menu when modal opens
  };

  const closeEditModal = () => {
    setEditingId(null);
    setEditMode(null);
    setEditName('');
  };

  const toggleEditMenu = (id) => {
    setShowEditMenu(showEditMenu === id ? null : id);
  };

  const applyTimeEdit = () => {
    const hours = parseInt(editHours) || 0;
    const minutes = parseInt(editMinutes) || 0;
    const seconds = parseInt(editSeconds) || 0;
    const totalSeconds = hours * 3600 + minutes * 60 + seconds;

    setActivities(prev => prev.map(activity => {
      if (activity.id === editingId) {
        if (editMode === 'rename') {
          return { ...activity, name: editName.trim() || activity.name };
        }
        
        let newElapsed = activity.elapsed;
        
        if (editMode === 'add') {
          newElapsed = activity.elapsed + totalSeconds;
        } else if (editMode === 'replace') {
          newElapsed = totalSeconds;
        } else if (editMode === 'delete') {
          newElapsed = Math.max(0, activity.elapsed - totalSeconds);
        }
        
        return { ...activity, elapsed: newElapsed };
      }
      return activity;
    }));
    
    closeEditModal();
  };

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTotalTime = (activityList) => {
    return activityList.reduce((sum, a) => sum + a.elapsed, 0);
  };

  const getActivityBreakdown = (activityList) => {
    const grouped = activityList.reduce((acc, activity) => {
      const name = activity.name;
      if (!acc[name]) {
        acc[name] = 0;
      }
      acc[name] += activity.elapsed;
      return acc;
    }, {});

    return Object.entries(grouped).map(([name, value]) => ({
      name,
      value,
      minutes: Math.round(value / 60)
    }));
  };

  const exportData = () => {
    const dataStr = JSON.stringify({ activities }, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `marian-study-tracker-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  const importData = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (imported.activities) {
          setActivities(imported.activities);
        }
      } catch (err) {
        alert('Error importing file');
      }
    };
    reader.readAsText(file);
  };

  const getHistoricalDates = () => {
    const dates = {};
    activities.forEach(activity => {
      const dateStr = new Date(activity.date).toDateString();
      if (!dates[dateStr]) {
        dates[dateStr] = [];
      }
      dates[dateStr].push(activity);
    });
    return Object.entries(dates)
      .map(([date, acts]) => ({
        date,
        activities: acts,
        total: getTotalTime(acts)
      }))
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  const getCalendarData = () => {
    try {
      const today = new Date();
      const data = [];

      if (calendarView === 'day') {
        // Last 30 days
        for (let i = 29; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          const dateStr = date.toDateString();
          const dayActivities = activities.filter(a => {
            try {
              return new Date(a.date).toDateString() === dateStr;
            } catch {
              return false;
            }
          });
          
          const breakdown = getActivityBreakdown(dayActivities);
          const dataPoint = {
            date: dateStr,
            shortDate: `${date.getMonth() + 1}/${date.getDate()}`,
            total: getTotalTime(dayActivities),
            activities: dayActivities
          };
          
          // Add breakdown as separate properties for stacked bars
          breakdown.forEach(item => {
            dataPoint[item.name] = item.value;
          });
          
          data.push(dataPoint);
        }
      } else if (calendarView === 'week') {
        // Last 12 weeks
        for (let i = 11; i >= 0; i--) {
          const weekEnd = new Date(today);
          weekEnd.setDate(weekEnd.getDate() - (i * 7));
          const weekStart = new Date(weekEnd);
          weekStart.setDate(weekStart.getDate() - 6);
          
          const weekActivities = activities.filter(a => {
            try {
              const actDate = new Date(a.date);
              return actDate >= weekStart && actDate <= weekEnd;
            } catch {
              return false;
            }
          });
          
          const breakdown = getActivityBreakdown(weekActivities);
          const dataPoint = {
            date: `${weekStart.getMonth() + 1}/${weekStart.getDate()} - ${weekEnd.getMonth() + 1}/${weekEnd.getDate()}`,
            shortDate: `Wk ${12 - i}`,
            total: getTotalTime(weekActivities),
            activities: weekActivities
          };
          
          // Add breakdown as separate properties for stacked bars
          breakdown.forEach(item => {
            dataPoint[item.name] = item.value;
          });
          
          data.push(dataPoint);
        }
      } else if (calendarView === 'month') {
        // Last 12 months
        for (let i = 11; i >= 0; i--) {
          const month = new Date(today.getFullYear(), today.getMonth() - i, 1);
          const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
          
          const monthActivities = activities.filter(a => {
            try {
              const actDate = new Date(a.date);
              return actDate.getMonth() === month.getMonth() && 
                     actDate.getFullYear() === month.getFullYear();
            } catch {
              return false;
            }
          });
          
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const breakdown = getActivityBreakdown(monthActivities);
          const dataPoint = {
            date: `${monthNames[month.getMonth()]} ${month.getFullYear()}`,
            shortDate: monthNames[month.getMonth()],
            total: getTotalTime(monthActivities),
            activities: monthActivities
          };
          
          // Add breakdown as separate properties for stacked bars
          breakdown.forEach(item => {
            dataPoint[item.name] = item.value;
          });
          
          data.push(dataPoint);
        }
      }

      return data;
    } catch (error) {
      console.error('Error generating calendar data:', error);
      return [];
    }
  };

  const getAllTimeBreakdown = () => {
    try {
      return getActivityBreakdown(activities);
    } catch (error) {
      console.error('Error generating breakdown:', error);
      return [];
    }
  };

  const getAllActivityNames = () => {
    const names = new Set();
    activities.forEach(activity => names.add(activity.name));
    return Array.from(names);
  };

  const getActivityColor = (activityName) => {
    const allNames = getAllActivityNames();
    const index = allNames.indexOf(activityName);
    return COLORS[index % COLORS.length];
  };

  const MARIAN_BLUE = '#003DA5';
  const GOLD = '#D4AF37';
  const CREAM = '#FAF9F6';
  const DARK_BG = '#0a0a0a';
  const DARK_CARD = '#1a1a1a';
  const DARK_BORDER = '#2a2a2a';
  const DARK_TEXT = '#f0f0f0'; // Brighter for better visibility
  const DARK_TEXT_SECONDARY = '#b8b8b8'; // Brighter secondary text
  const ACCENT_BLUE = '#89b4f8'; // Lighter blue for better visibility
  const COLORS = ['#003DA5', '#4169E1', '#6495ED', '#87CEEB', '#B0C4DE'];

  const todayActivities = getTodayActivities();
  const todayTotal = getTotalTime(todayActivities);
  const breakdown = getActivityBreakdown(todayActivities);
  const historicalDates = getHistoricalDates();
  const calendarData = getCalendarData() || [];
  const allTimeBreakdown = getAllTimeBreakdown() || [];
  const allTimeTotal = getTotalTime(activities) || 0;
  const activityNames = getAllActivityNames();

  return (
    <div className="min-h-screen" style={{ backgroundColor: DARK_BG }}>
      {/* Header with Marian aesthetic */}
      <div className="border-b-4 relative overflow-hidden" style={{ 
        borderColor: GOLD 
      }}>
        {/* Marian fabric pattern background */}
        <div className="absolute inset-0" style={{
          backgroundColor: '#001a4d',
          backgroundImage: `
            radial-gradient(circle at 20% 30%, rgba(212, 175, 55, 0.08) 0%, transparent 2%),
            radial-gradient(circle at 80% 70%, rgba(212, 175, 55, 0.08) 0%, transparent 2%),
            radial-gradient(circle at 40% 80%, rgba(212, 175, 55, 0.06) 0%, transparent 2%),
            radial-gradient(circle at 60% 20%, rgba(212, 175, 55, 0.06) 0%, transparent 2%),
            radial-gradient(circle at 90% 40%, rgba(212, 175, 55, 0.05) 0%, transparent 2%),
            radial-gradient(circle at 10% 60%, rgba(212, 175, 55, 0.05) 0%, transparent 2%),
            linear-gradient(135deg, ${MARIAN_BLUE} 0%, #001a4d 50%, #002266 100%)
          `,
          backgroundSize: '100% 100%, 100% 100%, 100% 100%, 100% 100%, 100% 100%, 100% 100%, 100% 100%'
        }}>
          {/* Subtle damask-like pattern overlay */}
          <svg className="absolute inset-0 w-full h-full opacity-10" style={{ mixBlendMode: 'overlay' }}>
            <defs>
              <pattern id="marian-pattern" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
                {/* Marian stars */}
                <circle cx="40" cy="40" r="1.5" fill="gold" opacity="0.4"/>
                <circle cx="10" cy="20" r="1" fill="gold" opacity="0.3"/>
                <circle cx="70" cy="60" r="1" fill="gold" opacity="0.3"/>
                
                {/* Subtle fleur-de-lis shapes */}
                <path d="M20,10 Q20,5 25,5 Q30,5 30,10 Q30,5 35,5 Q40,5 40,10 L35,15 L30,12 L25,15 Z" 
                      fill="gold" opacity="0.15" transform="scale(0.3)"/>
                <path d="M20,10 Q20,5 25,5 Q30,5 30,10 Q30,5 35,5 Q40,5 40,10 L35,15 L30,12 L25,15 Z" 
                      fill="gold" opacity="0.15" transform="translate(50, 50) scale(0.3)"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#marian-pattern)"/>
          </svg>
        </div>
        
        <div className="max-w-4xl mx-auto px-4 py-6 relative z-10">
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="text-yellow-300 text-2xl">✦</div>
              <h1 className="text-4xl heading-font text-white tracking-wide drop-shadow-lg" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
                Mary's Time Keeper
              </h1>
              <div className="text-yellow-300 text-2xl">✦</div>
            </div>
            <p className="text-blue-200 text-sm marian-serif drop-shadow" style={{ fontStyle: 'italic' }}>
              Ora et Labora
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Navigation */}
        <div className="flex gap-2 mb-6 justify-center">
          <button
            onClick={() => setView('today')}
            className={`px-6 py-2 rounded-lg font-medium transition-all mit-sans ${
              view === 'today' 
                ? 'text-white shadow-lg' 
                : 'hover:shadow-md'
            }`}
            style={view === 'today' ? { backgroundColor: MARIAN_BLUE, color: 'white' } : { backgroundColor: DARK_CARD, color: DARK_TEXT }}
          >
            <Home className="inline mr-2 h-4 w-4" />
            Today
          </button>
          <button
            onClick={() => setView('history')}
            className={`px-6 py-2 rounded-lg font-medium transition-all mit-sans ${
              view === 'history' 
                ? 'text-white shadow-lg' 
                : 'hover:shadow-md'
            }`}
            style={view === 'history' ? { backgroundColor: MARIAN_BLUE, color: 'white' } : { backgroundColor: DARK_CARD, color: DARK_TEXT }}
          >
            <Calendar className="inline mr-2 h-4 w-4" />
            History
          </button>
        </div>

        {view === 'today' ? (
          <>
            {/* Add Activity */}
            <div className="rounded-lg shadow-md p-6 mb-6 border-2" style={{ backgroundColor: DARK_CARD, borderColor: GOLD }}>
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={newActivityName}
                  onChange={(e) => setNewActivityName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addActivity()}
                  placeholder="New activity name (press N to focus)"
                  className="flex-1 px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 mit-sans"
                  style={{ 
                    borderColor: MARIAN_BLUE,
                    backgroundColor: DARK_BG,
                    color: DARK_TEXT
                  }}
                />
                <button
                  onClick={addActivity}
                  className="px-6 py-3 text-white rounded-lg hover:opacity-90 transition-all shadow-md font-medium"
                  style={{ backgroundColor: MARIAN_BLUE }}
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
              <p className="text-xs mt-2 text-center mit-sans" style={{ color: DARK_TEXT_SECONDARY, fontStyle: 'italic' }}>
                Keyboard: N = new activity, Space = start/stop timer
              </p>
            </div>

            {/* Active Timers */}
            <div className="space-y-3 mb-8">
              {todayActivities.length === 0 ? (
                <div className="text-center py-12 rounded-lg shadow-md" style={{ backgroundColor: DARK_CARD }}>
                  <p className="marian-serif" style={{ color: DARK_TEXT_SECONDARY, fontStyle: 'italic' }}>No activities yet today. Begin your work.</p>
                </div>
              ) : (
                todayActivities.map(activity => (
                  <div
                    key={activity.id}
                    className="rounded-lg shadow-md p-4 border-l-4 flex items-center justify-between"
                    style={{ 
                      borderLeftColor: activity.isRunning ? GOLD : MARIAN_BLUE,
                      backgroundColor: activity.isRunning ? '#1a2744' : DARK_CARD
                    }}
                  >
                    <div className="flex-1">
                      <h3 className="font-medium mit-sans" style={{ color: DARK_TEXT }}>{activity.name}</h3>
                      <p className="text-2xl mono-font mt-1" style={{ color: ACCENT_BLUE }}>
                        {formatTime(activity.elapsed)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleTimer(activity.id)}
                        className="p-3 rounded-lg hover:opacity-90 transition-all text-white shadow-md"
                        style={{ backgroundColor: activity.isRunning ? '#dc2626' : MARIAN_BLUE }}
                      >
                        {activity.isRunning ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                      </button>
                      <div className="relative edit-menu-container">
                        <button
                          onClick={() => toggleEditMenu(activity.id)}
                          className="p-3 rounded-lg hover:opacity-90 transition-all text-white shadow-md"
                          style={{ backgroundColor: GOLD }}
                        >
                          <Edit3 className="h-5 w-5" />
                        </button>
                        {showEditMenu === activity.id && (
                          <div className="absolute right-0 mt-2 w-40 rounded-lg shadow-xl border-2 z-10 mit-sans"
                            style={{ backgroundColor: DARK_CARD, borderColor: GOLD }}>
                            <button
                              onClick={() => openEditModal(activity.id, 'rename')}
                              className="w-full px-4 py-2 text-left hover:bg-opacity-80 rounded-t-lg text-sm"
                              style={{ color: DARK_TEXT, backgroundColor: 'transparent' }}
                              onMouseEnter={(e) => e.target.style.backgroundColor = DARK_BORDER}
                              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                            >
                              Rename
                            </button>
                            <button
                              onClick={() => openEditModal(activity.id, 'add')}
                              className="w-full px-4 py-2 text-left text-sm"
                              style={{ color: DARK_TEXT, backgroundColor: 'transparent' }}
                              onMouseEnter={(e) => e.target.style.backgroundColor = DARK_BORDER}
                              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                            >
                              Add Time
                            </button>
                            <button
                              onClick={() => openEditModal(activity.id, 'replace')}
                              className="w-full px-4 py-2 text-left text-sm"
                              style={{ color: DARK_TEXT, backgroundColor: 'transparent' }}
                              onMouseEnter={(e) => e.target.style.backgroundColor = DARK_BORDER}
                              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                            >
                              Replace Time
                            </button>
                            <button
                              onClick={() => openEditModal(activity.id, 'delete')}
                              className="w-full px-4 py-2 text-left rounded-b-lg text-sm"
                              style={{ color: DARK_TEXT, backgroundColor: 'transparent' }}
                              onMouseEnter={(e) => e.target.style.backgroundColor = DARK_BORDER}
                              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                            >
                              Delete Time
                            </button>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => deleteActivity(activity.id)}
                        className="p-3 rounded-lg hover:opacity-90 transition-all shadow-md"
                        style={{ backgroundColor: DARK_BORDER, color: DARK_TEXT }}
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Today's Summary */}
            {todayActivities.length > 0 && (
              <div className="rounded-lg shadow-md p-6 border-2" style={{ backgroundColor: DARK_CARD, borderColor: GOLD }}>
                <h2 className="text-2xl heading-font mb-4 text-center" style={{ color: ACCENT_BLUE }}>
                  Today's Summary
                </h2>
                <div className="text-center mb-6">
                  <p className="text-sm marian-serif" style={{ color: DARK_TEXT_SECONDARY }}>Total Study Time</p>
                  <p className="text-4xl mono-font mt-2" style={{ color: ACCENT_BLUE }}>
                    {formatTime(todayTotal)}
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Pie Chart */}
                  <div>
                    <h3 className="text-center marian-serif mb-2" style={{ color: DARK_TEXT }}>Distribution</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={breakdown}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={(entry) => `${entry.name} (${entry.minutes}m)`}
                        >
                          {breakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: DARK_CARD, border: `1px solid ${DARK_BORDER}`, color: DARK_TEXT }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Bar Chart */}
                  <div>
                    <h3 className="text-center marian-serif mb-2" style={{ color: DARK_TEXT }}>Minutes by Activity</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={breakdown}>
                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: DARK_TEXT }} />
                        <YAxis tick={{ fill: DARK_TEXT }} />
                        <Tooltip contentStyle={{ backgroundColor: DARK_CARD, border: `1px solid ${DARK_BORDER}`, color: DARK_TEXT }} />
                        <Bar dataKey="minutes" fill={MARIAN_BLUE} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {/* History View */}
            <div className="rounded-lg shadow-md p-6 mb-6 border-2" style={{ backgroundColor: DARK_CARD, borderColor: GOLD }}>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl heading-font" style={{ color: ACCENT_BLUE }}>
                  Study History
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={exportData}
                    className="px-4 py-2 text-white rounded-lg hover:opacity-90 text-sm font-medium mit-sans"
                    style={{ backgroundColor: MARIAN_BLUE }}
                  >
                    <Download className="inline h-4 w-4 mr-1" />
                    Export
                  </button>
                  <label className="px-4 py-2 text-white rounded-lg hover:opacity-90 text-sm font-medium cursor-pointer mit-sans"
                    style={{ backgroundColor: GOLD }}>
                    <Upload className="inline h-4 w-4 mr-1" />
                    Import
                    <input type="file" accept=".json" onChange={importData} className="hidden" />
                  </label>
                </div>
              </div>

              {/* All-Time Summary */}
              <div className="mb-8 p-6 rounded-lg" style={{ backgroundColor: DARK_BG }}>
                <h3 className="text-xl heading-font mb-4 text-center" style={{ color: ACCENT_BLUE }}>
                  All-Time Summary
                </h3>
                <div className="text-center mb-6">
                  <p className="text-sm marian-serif" style={{ color: DARK_TEXT_SECONDARY }}>Total Study Time</p>
                  <p className="text-4xl mono-font mt-2" style={{ color: ACCENT_BLUE }}>
                    {formatTime(allTimeTotal)}
                  </p>
                  <p className="text-lg mt-1 mit-sans" style={{ color: DARK_TEXT_SECONDARY }}>
                    {Math.round(allTimeTotal / 3600)} hours total
                  </p>
                </div>

                {allTimeBreakdown.length > 0 && (
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* All-Time Pie Chart */}
                    <div>
                      <h4 className="text-center marian-serif mb-2 text-sm" style={{ color: DARK_TEXT }}>Activity Distribution</h4>
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={allTimeBreakdown}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={90}
                            label={(entry) => `${entry.name}`}
                          >
                            {allTimeBreakdown.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value) => `${Math.round(value / 60)} min`}
                            contentStyle={{ backgroundColor: DARK_CARD, border: `1px solid ${DARK_BORDER}`, color: DARK_TEXT }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Activity Time Breakdown */}
                    <div>
                      <h4 className="text-center marian-serif mb-3 text-sm" style={{ color: DARK_TEXT }}>Time by Activity</h4>
                      <div className="space-y-2">
                        {allTimeBreakdown.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center p-2 rounded" style={{ backgroundColor: DARK_CARD }}>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                              <span className="text-sm font-medium mit-sans" style={{ color: DARK_TEXT }}>{item.name}</span>
                            </div>
                            <div className="text-right">
                              <div className="mono-font text-sm" style={{ color: ACCENT_BLUE }}>
                                {formatTime(item.value)}
                              </div>
                              <div className="text-xs mit-sans" style={{ color: DARK_TEXT_SECONDARY }}>
                                {Math.round((item.value / allTimeTotal) * 100)}%
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Calendar View Tabs */}
              <div className="flex gap-2 mb-6 justify-center">
                <button
                  onClick={() => setCalendarView('day')}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-all mit-sans ${
                    calendarView === 'day' 
                      ? 'text-white shadow-md' 
                      : 'hover:bg-opacity-80'
                  }`}
                  style={calendarView === 'day' ? { backgroundColor: MARIAN_BLUE } : { backgroundColor: DARK_BORDER, color: DARK_TEXT }}
                >
                  Daily
                </button>
                <button
                  onClick={() => setCalendarView('week')}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-all mit-sans ${
                    calendarView === 'week' 
                      ? 'text-white shadow-md' 
                      : 'hover:bg-opacity-80'
                  }`}
                  style={calendarView === 'week' ? { backgroundColor: MARIAN_BLUE } : { backgroundColor: DARK_BORDER, color: DARK_TEXT }}
                >
                  Weekly
                </button>
                <button
                  onClick={() => setCalendarView('month')}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-all mit-sans ${
                    calendarView === 'month' 
                      ? 'text-white shadow-md' 
                      : 'hover:bg-opacity-80'
                  }`}
                  style={calendarView === 'month' ? { backgroundColor: MARIAN_BLUE } : { backgroundColor: DARK_BORDER, color: DARK_TEXT }}
                >
                  Monthly
                </button>
              </div>

              {/* Calendar Bar Chart */}
              {calendarData.length > 0 && (
                <div className="mb-6">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={calendarData}>
                      <XAxis 
                        dataKey="shortDate" 
                        tick={{ fontSize: 11, fill: DARK_TEXT }}
                        angle={calendarView === 'day' ? -45 : 0}
                        textAnchor={calendarView === 'day' ? 'end' : 'middle'}
                        height={calendarView === 'day' ? 60 : 30}
                      />
                      <YAxis 
                        tickFormatter={(value) => `${Math.round(value / 3600)}h`}
                        tick={{ fontSize: 11, fill: DARK_TEXT }}
                      />
                      <Tooltip 
                        formatter={(value, name) => [formatTime(value), name]}
                        labelFormatter={(label) => {
                          const item = calendarData.find(d => d.shortDate === label);
                          return item?.date || label;
                        }}
                        contentStyle={{ backgroundColor: DARK_CARD, border: `1px solid ${DARK_BORDER}`, color: DARK_TEXT }}
                      />
                      {activityNames.map((name, idx) => (
                        <Bar 
                          key={name} 
                          dataKey={name} 
                          stackId="a" 
                          fill={getActivityColor(name)}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                  
                  {/* Legend */}
                  {activityNames.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-3 mt-4">
                      {activityNames.map((name, idx) => (
                        <div key={name} className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded" 
                            style={{ backgroundColor: getActivityColor(name) }}
                          ></div>
                          <span className="text-sm mit-sans" style={{ color: DARK_TEXT }}>{name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Detailed List View */}
              {historicalDates.length === 0 ? (
                <p className="text-center py-8 marian-serif" style={{ color: DARK_TEXT_SECONDARY, fontStyle: 'italic' }}>No study history yet.</p>
              ) : (
                <div>
                  <h3 className="heading-font text-lg mb-3" style={{ color: ACCENT_BLUE }}>Daily Details</h3>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {historicalDates.map(({ date, activities: dateActivities, total }) => (
                      <div
                        key={date}
                        className="border-l-4 pl-4 py-3 cursor-pointer rounded-r-lg transition-all"
                        style={{ 
                          borderLeftColor: MARIAN_BLUE,
                          backgroundColor: selectedDate === date ? DARK_BORDER : 'transparent'
                        }}
                        onClick={() => setSelectedDate(selectedDate === date ? null : date)}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = DARK_BORDER}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = selectedDate === date ? DARK_BORDER : 'transparent'}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="font-medium mit-sans" style={{ color: DARK_TEXT }}>{date}</h3>
                            <p className="text-sm mit-sans" style={{ color: DARK_TEXT_SECONDARY }}>
                              {dateActivities.length} {dateActivities.length === 1 ? 'activity' : 'activities'}
                            </p>
                          </div>
                          <p className="text-xl mono-font" style={{ color: ACCENT_BLUE }}>
                            {formatTime(total)}
                          </p>
                        </div>

                        {selectedDate === date && (
                          <div className="mt-4 space-y-2 border-t pt-3" style={{ borderColor: DARK_BORDER }}>
                            {dateActivities.map(activity => (
                              <div key={activity.id} className="flex justify-between text-sm">
                                <span className="mit-sans" style={{ color: DARK_TEXT }}>{activity.name}</span>
                                <span className="mono-font" style={{ color: DARK_TEXT_SECONDARY }}>{formatTime(activity.elapsed)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Edit Time Modal */}
      {editingId && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="rounded-lg shadow-2xl max-w-md w-full p-6 border-4" style={{ backgroundColor: DARK_CARD, borderColor: GOLD }}>
            <h3 className="text-xl heading-font mb-4 text-center" style={{ color: ACCENT_BLUE }}>
              {editMode === 'rename' && 'Rename Activity'}
              {editMode === 'add' && 'Add Time'}
              {editMode === 'replace' && 'Replace Time'}
              {editMode === 'delete' && 'Delete Time'}
            </h3>
            
            <p className="text-sm mb-4 text-center marian-serif" style={{ color: DARK_TEXT_SECONDARY, fontStyle: 'italic' }}>
              {editMode === 'rename' && 'Enter a new name for this activity'}
              {editMode === 'add' && 'Add additional time to this activity'}
              {editMode === 'replace' && 'Set a new total time for this activity'}
              {editMode === 'delete' && 'Remove time from this activity'}
            </p>

            {editMode === 'rename' ? (
              <div className="mb-6">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && applyTimeEdit()}
                  placeholder="Activity name"
                  className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 mit-sans"
                  style={{ 
                    borderColor: MARIAN_BLUE,
                    backgroundColor: DARK_BG,
                    color: DARK_TEXT
                  }}
                  autoFocus
                />
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div>
                  <label className="block text-xs mb-1 text-center mit-sans" style={{ color: DARK_TEXT_SECONDARY }}>Hours</label>
                  <input
                    type="number"
                    min="0"
                    value={editHours}
                    onChange={(e) => setEditHours(e.target.value)}
                    className="w-full px-3 py-2 border-2 rounded-lg text-center focus:outline-none focus:ring-2 mono-font"
                    style={{ 
                      borderColor: MARIAN_BLUE,
                      backgroundColor: DARK_BG,
                      color: DARK_TEXT
                    }}
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1 text-center mit-sans" style={{ color: DARK_TEXT_SECONDARY }}>Minutes</label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={editMinutes}
                    onChange={(e) => setEditMinutes(e.target.value)}
                    className="w-full px-3 py-2 border-2 rounded-lg text-center focus:outline-none focus:ring-2 mono-font"
                    style={{ 
                      borderColor: MARIAN_BLUE,
                      backgroundColor: DARK_BG,
                      color: DARK_TEXT
                    }}
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1 text-center mit-sans" style={{ color: DARK_TEXT_SECONDARY }}>Seconds</label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={editSeconds}
                    onChange={(e) => setEditSeconds(e.target.value)}
                    className="w-full px-3 py-2 border-2 rounded-lg text-center focus:outline-none focus:ring-2 mono-font"
                    style={{ 
                      borderColor: MARIAN_BLUE,
                      backgroundColor: DARK_BG,
                      color: DARK_TEXT
                    }}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={closeEditModal}
                className="flex-1 px-4 py-2 rounded-lg font-medium mit-sans"
                style={{ 
                  backgroundColor: DARK_BORDER,
                  color: DARK_TEXT
                }}
              >
                Cancel
              </button>
              <button
                onClick={applyTimeEdit}
                className="flex-1 px-4 py-2 text-white rounded-lg hover:opacity-90 font-medium shadow-md mit-sans"
                style={{ backgroundColor: MARIAN_BLUE }}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center py-6 border-t-2" style={{ borderColor: GOLD }}>
        <p className="text-sm marian-serif" style={{ color: DARK_TEXT_SECONDARY, fontStyle: 'italic' }}>
          ✦ Ad Maiorem Dei Gloriam ✦
        </p>
      </div>
    </div>
  );
};

export default MarianStudyTracker;
