'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  X,
  Check,
  AlertTriangle,
  Clock,
  ListChecks,
  User,
} from 'lucide-react';

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

const ROLES = ['Director', 'Top Stylist', 'Stylist', 'Junior Stylist'] as const;

interface DaySchedule {
  dayOfWeek: number;
  isWorking: boolean;
  startTime: string;
  endTime: string;
}

interface Staff {
  id: string;
  name: string;
  nameEn: string;
  role: string;
  image: string;
  bio: string;
  experience: string;
  specialties: string;
  socialMedia: string;
  displayOrder: number;
  isActive: boolean;
  schedules?: DaySchedule[];
  menuIds?: string[];
}

interface MenuCategory {
  id: string;
  name: string;
  nameEn: string;
  color: string;
}

interface MenuItem {
  id: string;
  name: string;
  categoryId: string;
  isActive: boolean;
  category: MenuCategory;
}

export default function AdminStaffPage() {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal states
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [deletingStaff, setDeletingStaff] = useState<{ id: string; name: string } | null>(null);

  // Editing sub-sections
  const [showScheduleEditor, setShowScheduleEditor] = useState(false);
  const [showMenuAssignment, setShowMenuAssignment] = useState(false);
  // Schedule editor state
  const [scheduleData, setScheduleData] = useState<DaySchedule[]>([]);
  const [scheduleStaffId, setScheduleStaffId] = useState<string | null>(null);

  // Menu assignment state
  const [allMenus, setAllMenus] = useState<MenuItem[]>([]);
  const [assignedMenuIds, setAssignedMenuIds] = useState<string[]>([]);
  const [allMenusMode, setAllMenusMode] = useState(false);
  const [menuStaffId, setMenuStaffId] = useState<string | null>(null);

  // Staff form
  const [staffForm, setStaffForm] = useState({
    name: '',
    nameEn: '',
    role: 'Stylist' as string,
    image: '',
    bio: '',
    experience: '',
    specialties: '',
    socialMedia: '',
    displayOrder: 0,
    isActive: true,
  });

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/staff');
      if (!res.ok) throw new Error('データの取得に失敗しました');
      const data = await res.json();
      setStaffList(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const showSuccess = (message: string) => {
    setSuccess(message);
    setTimeout(() => setSuccess(null), 3000);
  };
  const showError = (message: string) => {
    setError(message);
    setTimeout(() => setError(null), 5000);
  };

  // --- Staff CRUD ---

  const openStaffModal = (staff?: Staff) => {
    if (staff) {
      setEditingStaff(staff);
      setStaffForm({
        name: staff.name,
        nameEn: staff.nameEn || '',
        role: staff.role || 'Stylist',
        image: staff.image || '',
        bio: staff.bio || '',
        experience: staff.experience || '',
        specialties: staff.specialties || '',
        socialMedia: staff.socialMedia || '',
        displayOrder: staff.displayOrder,
        isActive: staff.isActive,
      });
    } else {
      setEditingStaff(null);
      setStaffForm({
        name: '',
        nameEn: '',
        role: 'Stylist',
        image: '',
        bio: '',
        experience: '',
        specialties: '',
        socialMedia: '',
        displayOrder: staffList.length,
        isActive: true,
      });
    }
    setShowScheduleEditor(false);
    setShowMenuAssignment(false);
    setIsStaffModalOpen(true);
  };

  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingStaff
        ? `/api/admin/staff/${editingStaff.id}`
        : '/api/admin/staff';
      const method = editingStaff ? 'PATCH' : 'POST';

      // Parse specialties: comma-separated to JSON array string
      const specialtiesArray = staffForm.specialties
        ? staffForm.specialties
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

      const body = {
        ...staffForm,
        specialties: JSON.stringify(specialtiesArray),
        socialMedia: staffForm.socialMedia || '{}',
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '保存に失敗しました');
      }
      showSuccess(editingStaff ? 'スタッフを更新しました' : 'スタッフを追加しました');
      setIsStaffModalOpen(false);
      fetchStaff();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'エラーが発生しました');
    }
  };

  const handleDelete = async () => {
    if (!deletingStaff) return;
    try {
      const res = await fetch(`/api/admin/staff/${deletingStaff.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '削除に失敗しました');
      }
      showSuccess('削除しました');
      setIsDeleteModalOpen(false);
      setDeletingStaff(null);
      fetchStaff();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'エラーが発生しました');
    }
  };

  // --- Schedule Editor ---

  const openScheduleEditor = (staff: Staff) => {
    setScheduleStaffId(staff.id);
    // Initialize schedule: use existing data or default
    const existing = staff.schedules || [];
    const schedule: DaySchedule[] = Array.from({ length: 7 }, (_, i) => {
      const found = existing.find((s) => s.dayOfWeek === i);
      if (found) return { ...found };
      return {
        dayOfWeek: i,
        isWorking: i !== 1, // Monday (1) is default closed
        startTime: i === 0 || i === 6 ? '09:00' : '10:00',
        endTime: i === 0 || i === 6 ? '19:00' : '20:00',
      };
    });
    setScheduleData(schedule);
    setShowScheduleEditor(true);
    setShowMenuAssignment(false);
  };

  const updateScheduleDay = (dayOfWeek: number, updates: Partial<DaySchedule>) => {
    setScheduleData((prev) =>
      prev.map((d) => (d.dayOfWeek === dayOfWeek ? { ...d, ...updates } : d))
    );
  };

  const handleScheduleSave = async () => {
    if (!scheduleStaffId) return;
    try {
      const res = await fetch(`/api/admin/staff/${scheduleStaffId}/schedule`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedules: scheduleData }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'スケジュールの保存に失敗しました');
      }
      showSuccess('スケジュールを保存しました');
      fetchStaff();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'エラーが発生しました');
    }
  };

  // --- Menu Assignment ---

  const openMenuAssignment = async (staff: Staff) => {
    setMenuStaffId(staff.id);
    setShowMenuAssignment(true);
    setShowScheduleEditor(false);

    try {
      const res = await fetch('/api/admin/menus?includeInactive=true');
      if (!res.ok) throw new Error('メニューの取得に失敗しました');
      const menus: MenuItem[] = await res.json();
      setAllMenus(menus);

      // staff.menuIds: empty array means "all menus"
      const ids = staff.menuIds || [];
      if (ids.length === 0) {
        setAllMenusMode(true);
        setAssignedMenuIds([]);
      } else {
        setAllMenusMode(false);
        setAssignedMenuIds(ids);
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : 'エラーが発生しました');
    }
  };

  const toggleMenuId = (menuId: string) => {
    setAssignedMenuIds((prev) =>
      prev.includes(menuId) ? prev.filter((id) => id !== menuId) : [...prev, menuId]
    );
  };

  const handleMenuAssignmentSave = async () => {
    if (!menuStaffId) return;
    try {
      const body = allMenusMode ? { menuIds: [] } : { menuIds: assignedMenuIds };
      const res = await fetch(`/api/admin/staff/${menuStaffId}/menus`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'メニュー割当の保存に失敗しました');
      }
      showSuccess('メニュー割当を保存しました');
      fetchStaff();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'エラーが発生しました');
    }
  };

  // --- Helpers ---

  const getInitials = (name: string) => {
    return name
      .split(/[\s　]+/)
      .map((part) => part.charAt(0))
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  const parseSpecialties = (specialties: string): string[] => {
    try {
      const parsed = JSON.parse(specialties);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const formatSpecialtiesForInput = (specialties: string): string => {
    const arr = parseSpecialties(specialties);
    return arr.join(', ');
  };

  // Group menus by category
  const menusByCategory = allMenus.reduce(
    (acc, menu) => {
      const catId = menu.categoryId;
      if (!acc[catId]) {
        acc[catId] = { category: menu.category, menus: [] };
      }
      acc[catId].menus.push(menu);
      return acc;
    },
    {} as Record<string, { category: MenuCategory; menus: MenuItem[] }>
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="p-2 rounded-lg bg-white shadow-sm hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-medium">スタッフ管理</h1>
              <p className="text-sm text-gray-500 mt-1">
                スタッフの登録・編集・スケジュール管理
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/staff/schedule"
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 bg-white text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Clock className="w-4 h-4" />
              シフト管理
            </Link>
            <button
              onClick={() => openStaffModal()}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              スタッフ追加
            </button>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-600 rounded-lg text-sm">
            {success}
          </div>
        )}

        {/* Staff List */}
        {isLoading ? (
          <div className="p-12 text-center text-gray-500">読み込み中...</div>
        ) : staffList.length === 0 ? (
          <div className="p-12 text-center text-gray-500">スタッフがいません</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {staffList.map((staff) => (
              <div
                key={staff.id}
                className="bg-white rounded-xl shadow-sm p-5 flex flex-col"
              >
                <div className="flex items-start gap-4">
                  {/* Image or Initials */}
                  {staff.image ? (
                    <img
                      src={staff.image}
                      alt={staff.name}
                      className="w-14 h-14 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-medium text-gray-500">
                        {getInitials(staff.name)}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium truncate">{staff.name}</h3>
                      <span
                        className={`px-2 py-0.5 text-xs rounded-full flex-shrink-0 ${
                          staff.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {staff.isActive ? '有効' : '無効'}
                      </span>
                    </div>
                    {staff.nameEn && (
                      <p className="text-xs text-gray-400 mt-0.5">{staff.nameEn}</p>
                    )}
                    <p className="text-sm text-gray-600 mt-1">{staff.role}</p>
                    {staff.experience && (
                      <p className="text-xs text-gray-500 mt-0.5">経験: {staff.experience}</p>
                    )}
                  </div>
                </div>

                {/* Specialties */}
                {staff.specialties && parseSpecialties(staff.specialties).length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {parseSpecialties(staff.specialties).map((s, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}

                {/* Action buttons */}
                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-1">
                  <button
                    onClick={() => openStaffModal(staff)}
                    className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg"
                    title="編集"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openScheduleEditor(staff)}
                    className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg"
                    title="スケジュール"
                  >
                    <Clock className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openMenuAssignment(staff)}
                    className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg"
                    title="メニュー割当"
                  >
                    <ListChecks className="w-4 h-4" />
                  </button>
                  <div className="flex-1" />
                  <button
                    onClick={() => {
                      setDeletingStaff({ id: staff.id, name: staff.name });
                      setIsDeleteModalOpen(true);
                    }}
                    className="p-2 text-red-400 hover:bg-red-50 rounded-lg"
                    title="削除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Schedule Editor Panel */}
        {showScheduleEditor && scheduleStaffId && (
          <div className="mt-6 bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium flex items-center gap-2">
                <Clock className="w-5 h-5 text-gray-400" />
                スケジュール編集 -{' '}
                {staffList.find((s) => s.id === scheduleStaffId)?.name}
              </h3>
              <button
                onClick={() => setShowScheduleEditor(false)}
                className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
              {scheduleData.map((day) => (
                <div
                  key={day.dayOfWeek}
                  className={`border rounded-lg p-3 ${
                    day.isWorking ? 'border-gray-200' : 'border-gray-100 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-sm font-medium ${
                        day.dayOfWeek === 0
                          ? 'text-red-500'
                          : day.dayOfWeek === 6
                            ? 'text-blue-500'
                            : 'text-gray-700'
                      }`}
                    >
                      {WEEKDAYS[day.dayOfWeek]}
                    </span>
                    <button
                      onClick={() =>
                        updateScheduleDay(day.dayOfWeek, { isWorking: !day.isWorking })
                      }
                      className={`px-2 py-0.5 text-xs rounded-full transition-colors ${
                        day.isWorking
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {day.isWorking ? 'ON' : 'OFF'}
                    </button>
                  </div>
                  {day.isWorking && (
                    <div className="space-y-2">
                      <div>
                        <label className="block text-xs text-gray-500 mb-0.5">開始</label>
                        <input
                          type="time"
                          value={day.startTime}
                          onChange={(e) =>
                            updateScheduleDay(day.dayOfWeek, { startTime: e.target.value })
                          }
                          className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:border-gray-400"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-0.5">終了</label>
                        <input
                          type="time"
                          value={day.endTime}
                          onChange={(e) =>
                            updateScheduleDay(day.dayOfWeek, { endTime: e.target.value })
                          }
                          className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:border-gray-400"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleScheduleSave}
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
              >
                <Check className="w-4 h-4" />
                スケジュール保存
              </button>
            </div>
          </div>
        )}

        {/* Menu Assignment Panel */}
        {showMenuAssignment && menuStaffId && (
          <div className="mt-6 bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium flex items-center gap-2">
                <ListChecks className="w-5 h-5 text-gray-400" />
                メニュー割当 - {staffList.find((s) => s.id === menuStaffId)?.name}
              </h3>
              <button
                onClick={() => setShowMenuAssignment(false)}
                className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* All menus checkbox */}
            <label className="flex items-center gap-2 mb-4 cursor-pointer p-3 bg-gray-50 rounded-lg">
              <input
                type="checkbox"
                checked={allMenusMode}
                onChange={(e) => {
                  setAllMenusMode(e.target.checked);
                  if (e.target.checked) setAssignedMenuIds([]);
                }}
                className="w-4 h-4 text-gray-600 rounded"
              />
              <span className="text-sm font-medium text-gray-700">
                全メニュー対応
              </span>
              <span className="text-xs text-gray-500">
                (チェックすると全てのメニューに対応可能)
              </span>
            </label>

            {!allMenusMode && (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {Object.entries(menusByCategory).map(([catId, { category, menus }]) => (
                  <div key={catId}>
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: category.color }}
                      />
                      <h4 className="text-sm font-medium text-gray-700">{category.name}</h4>
                    </div>
                    <div className="space-y-1 pl-5">
                      {menus.map((menu) => (
                        <label
                          key={menu.id}
                          className="flex items-center gap-2 cursor-pointer py-1"
                        >
                          <input
                            type="checkbox"
                            checked={assignedMenuIds.includes(menu.id)}
                            onChange={() => toggleMenuId(menu.id)}
                            className="w-4 h-4 text-gray-600 rounded"
                          />
                          <span
                            className={`text-sm ${menu.isActive ? 'text-gray-700' : 'text-gray-400'}`}
                          >
                            {menu.name}
                            {!menu.isActive && ' (非表示)'}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 flex justify-end">
              <button
                onClick={handleMenuAssignmentSave}
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
              >
                <Check className="w-4 h-4" />
                メニュー割当保存
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Staff Modal */}
      {isStaffModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsStaffModalOpen(false)}
          />
          <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsStaffModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-medium mb-6">
              {editingStaff ? 'スタッフ編集' : 'スタッフ追加'}
            </h3>
            <form onSubmit={handleStaffSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  名前 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={staffForm.name}
                  onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">名前（英語）</label>
                <input
                  type="text"
                  value={staffForm.nameEn}
                  onChange={(e) => setStaffForm({ ...staffForm, nameEn: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">役職</label>
                <select
                  value={staffForm.role}
                  onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-gray-400"
                >
                  {ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">画像パス</label>
                <input
                  type="text"
                  value={staffForm.image}
                  onChange={(e) => setStaffForm({ ...staffForm, image: e.target.value })}
                  placeholder="/images/staff/example.jpg"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">自己紹介</label>
                <textarea
                  value={staffForm.bio}
                  onChange={(e) => setStaffForm({ ...staffForm, bio: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">経験</label>
                <input
                  type="text"
                  value={staffForm.experience}
                  onChange={(e) => setStaffForm({ ...staffForm, experience: e.target.value })}
                  placeholder="例: 10年"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  得意分野（カンマ区切り）
                </label>
                <input
                  type="text"
                  value={
                    editingStaff && staffForm.specialties
                      ? formatSpecialtiesForInput(staffForm.specialties)
                      : staffForm.specialties
                  }
                  onChange={(e) =>
                    setStaffForm({ ...staffForm, specialties: e.target.value })
                  }
                  placeholder="例: カット, カラー, パーマ"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  ソーシャルメディア（JSON）
                </label>
                <input
                  type="text"
                  value={staffForm.socialMedia}
                  onChange={(e) =>
                    setStaffForm({ ...staffForm, socialMedia: e.target.value })
                  }
                  placeholder='例: {"instagram": "@username"}'
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">表示順</label>
                  <input
                    type="number"
                    value={staffForm.displayOrder}
                    onChange={(e) =>
                      setStaffForm({ ...staffForm, displayOrder: Number(e.target.value) })
                    }
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={staffForm.isActive}
                      onChange={(e) =>
                        setStaffForm({ ...staffForm, isActive: e.target.checked })
                      }
                      className="w-4 h-4 text-gray-600 rounded"
                    />
                    <span className="text-sm text-gray-600">有効</span>
                  </label>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsStaffModalOpen(false)}
                  className="flex-1 py-3 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700"
                >
                  <Check className="w-4 h-4 inline mr-1" />
                  {editingStaff ? '更新' : '追加'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && deletingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsDeleteModalOpen(false)}
          />
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-full bg-red-100 text-red-600">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-medium">削除確認</h3>
            </div>
            <p className="text-gray-600 mb-6">
              「{deletingStaff.name}」を削除しますか？この操作は取り消せません。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 py-3 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
