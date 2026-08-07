import React, { useState, useEffect, useRef } from 'react';
import { 
  Folder, Shield, HardDrive, Download, UploadCloud, Share2, LogOut, 
  User, Users, Activity, Trash2, Search, Filter, ArrowUpDown, 
  Key, Eye, Clock, Lock, Settings, AlertCircle, CheckCircle2, 
  Menu, X, ChevronRight, Grid, List, ExternalLink, FileText, 
  Image as ImageIcon, Video, File, Music, Copy
} from 'lucide-react';
import api from './api';
import GlassCard from './components/GlassCard';
import FilePreviewModal from './components/FilePreviewModal';

export default function App() {
  // Global States
  const [token, setToken] = useState(localStorage.getItem('cloudvault_token'));
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('cloudvault_user')));
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [alert, setAlert] = useState({ type: '', message: '' });

  // Share link routing state
  const [shareId, setShareId] = useState(null);
  const [shareInfo, setShareInfo] = useState(null);
  const [sharePassword, setSharePassword] = useState('');
  const [shareLoading, setShareLoading] = useState(false);
  
  // Dashboard & Files States
  const [files, setFiles] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [layoutMode, setLayoutMode] = useState('list'); // 'grid' | 'list'
  
  // Upload States
  const [uploadProgress, setUploadProgress] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Share Configuration Dialog States
  const [sharingFile, setSharingFile] = useState(null);
  const [shareExpires, setShareExpires] = useState('24'); // hours
  const [sharePass, setSharePass] = useState('');
  const [shareLimit, setShareLimit] = useState('');
  const [createdShareLink, setCreatedShareLink] = useState('');

  // Active Share Links Management
  const [myShares, setMyShares] = useState([]);

  // File Preview State
  const [previewingFile, setPreviewingFile] = useState(null);

  // Admin Dashboard States
  const [adminStats, setAdminStats] = useState(null);
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminFiles, setAdminFiles] = useState([]);

  // User Profile Settings State
  const [profileName, setProfileName] = useState(user ? user.username : '');
  const [profileCurrPass, setProfileCurrPass] = useState('');
  const [profileNewPass, setProfileNewPass] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  // Auth Forms State
  const [authIsLogin, setAuthIsLogin] = useState(true);
  const [authUsername, setAuthUsername] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Trigger temporary toast notifications
  const triggerAlert = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => {
      setAlert({ type: '', message: '' });
    }, 4000);
  };

  // Check URL routing for shared links on startup
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/share/')) {
      const id = path.replace('/share/', '');
      if (id) {
        setShareId(id);
        fetchShareDetails(id);
      }
    }
  }, []);

  // Fetch share link metadata
  const fetchShareDetails = async (id) => {
    setShareLoading(true);
    try {
      const response = await api.get(`/share/public/${id}`);
      setShareInfo(response.data);
    } catch (err) {
      console.error(err);
      triggerAlert('error', err.response?.data?.error || 'Failed to retrieve shared file details.');
    } finally {
      setShareLoading(false);
    }
  };

  // Fetch data depending on tab
  useEffect(() => {
    if (token) {
      if (currentTab === 'dashboard') {
        loadDashboardData();
      } else if (currentTab === 'files') {
        loadFiles();
      } else if (currentTab === 'share-center') {
        loadMyShareLinks();
      } else if (currentTab === 'activity-logs') {
        loadActivityLogs();
      } else if (currentTab === 'admin') {
        loadAdminData();
      }
    }
  }, [currentTab, token, searchQuery, selectedCategory, sortBy]);

  const loadDashboardData = async () => {
    try {
      const filesList = await api.get('/files');
      setFiles(filesList.data.slice(0, 5)); // show top 5

      const logsList = await api.get('/activity-logs');
      setRecentLogs(logsList.data.slice(0, 5));
    } catch (err) {
      console.error(err);
    }
  };

  const loadFiles = async () => {
    setLoadingFiles(true);
    try {
      const res = await api.get('/files', {
        params: {
          search: searchQuery,
          category: selectedCategory,
          sort: sortBy
        }
      });
      setFiles(res.data);
    } catch (err) {
      triggerAlert('error', 'Failed to retrieve file list');
    } finally {
      setLoadingFiles(false);
    }
  };

  const loadMyShareLinks = async () => {
    try {
      const res = await api.get('/share/links');
      setMyShares(res.data);
    } catch (err) {
      triggerAlert('error', 'Failed to load active share links');
    }
  };

  const loadActivityLogs = async () => {
    try {
      const res = await api.get('/activity-logs');
      setRecentLogs(res.data);
    } catch (err) {
      triggerAlert('error', 'Failed to retrieve activity log');
    }
  };

  const loadAdminData = async () => {
    try {
      const statsRes = await api.get('/admin/stats');
      setAdminStats(statsRes.data);

      const usersRes = await api.get('/admin/users');
      setAdminUsers(usersRes.data);

      const filesRes = await api.get('/admin/files');
      setAdminFiles(filesRes.data);
    } catch (err) {
      triggerAlert('error', 'Failed to access administration tables');
    }
  };

  // Authenticate user
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
      if (authIsLogin) {
        const res = await api.post('/auth/login', { email: authEmail, password: authPassword });
        localStorage.setItem('cloudvault_token', res.data.token);
        localStorage.setItem('cloudvault_user', JSON.stringify(res.data.user));
        setToken(res.data.token);
        setUser(res.data.user);
        setProfileName(res.data.user.username);
        triggerAlert('success', `Welcome back, ${res.data.user.username}!`);
      } else {
        await api.post('/auth/register', { username: authUsername, email: authEmail, password: authPassword });
        setAuthIsLogin(true);
        triggerAlert('success', 'Registration complete. You can now login.');
      }
      setAuthPassword('');
    } catch (err) {
      triggerAlert('error', err.response?.data?.message || err.response?.data?.error || 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('cloudvault_token');
    localStorage.removeItem('cloudvault_user');
    setToken(null);
    setUser(null);
    triggerAlert('success', 'Logged out successfully');
  };

  // Upload file handler
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setIsUploading(true);
    setUploadProgress(0);

    try {
      await api.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(progress);
        }
      });
      triggerAlert('success', `Uploaded "${file.name}" successfully!`);
      loadFiles();
      loadDashboardData();
    } catch (err) {
      triggerAlert('error', err.response?.data?.error || 'File upload failed');
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Download file handler
  const handleDownload = async (file) => {
    try {
      triggerAlert('success', `Starting download for "${file.name}"...`);
      // Fetch download as blob
      const res = await api.get(`/files/${file.id}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', file.name);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      triggerAlert('error', 'Download request failed.');
    }
  };

  // Delete file
  const handleDeleteFile = async (fileId) => {
    if (!window.confirm('Are you sure you want to permanently delete this file? This will also revoke all share links.')) return;
    try {
      await api.delete(`/files/${fileId}`);
      triggerAlert('success', 'File deleted successfully.');
      loadFiles();
      loadDashboardData();
    } catch (err) {
      triggerAlert('error', 'Failed to delete file.');
    }
  };

  // Generate public share link
  const handleCreateShareLink = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/share/create', {
        file_id: sharingFile.id,
        expires_in_hours: shareExpires === 'never' ? null : parseFloat(shareExpires),
        password: sharePass || null,
        download_limit: shareLimit ? parseInt(shareLimit) : null
      });

      const fullUrl = `${window.location.protocol}//${window.location.host}/share/${res.data.shareId}`;
      setCreatedShareLink(fullUrl);
      triggerAlert('success', 'Share link generated successfully!');
      loadMyShareLinks();
    } catch (err) {
      triggerAlert('error', err.response?.data?.error || 'Failed to create share link.');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    triggerAlert('success', 'Link copied to clipboard!');
  };

  // Revoke active share link
  const handleRevokeShare = async (id) => {
    if (!window.confirm('Are you sure you want to revoke this public sharing link?')) return;
    try {
      await api.delete(`/share/links/${id}`);
      triggerAlert('success', 'Link revoked.');
      loadMyShareLinks();
    } catch (err) {
      triggerAlert('error', 'Failed to revoke link.');
    }
  };

  // Update profile
  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    try {
      await api.put('/profile', {
        username: profileName,
        currentPassword: profileCurrPass,
        newPassword: profileNewPass
      });
      // Update local storage username
      const updatedUser = { ...user, username: profileName };
      localStorage.setItem('cloudvault_user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      setProfileCurrPass('');
      setProfileNewPass('');
      triggerAlert('success', 'Account details updated successfully!');
    } catch (err) {
      triggerAlert('error', err.response?.data?.error || 'Failed to update profile settings.');
    } finally {
      setProfileLoading(false);
    }
  };

  // Admin delete actions
  const adminDeleteUser = async (userId) => {
    if (!window.confirm('CAUTION: Deleting this user will purge all their uploaded files, shares, and transaction history. Continue?')) return;
    try {
      await api.delete(`/admin/users/${userId}`);
      triggerAlert('success', 'User purged successfully.');
      loadAdminData();
    } catch (err) {
      triggerAlert('error', err.response?.data?.error || 'Admin delete user failed.');
    }
  };

  const adminDeleteFile = async (fileId) => {
    if (!window.confirm('Delete this user file permanently from storage?')) return;
    try {
      await api.delete(`/admin/files/${fileId}`);
      triggerAlert('success', 'File purged.');
      loadAdminData();
    } catch (err) {
      triggerAlert('error', err.response?.data?.error || 'Admin delete file failed.');
    }
  };

  // Download shared public file
  const handlePublicDownload = async () => {
    setShareLoading(true);
    try {
      const res = await api.post(`/share/public/${shareId}/download`, 
        { password: sharePassword || null }, 
        { responseType: 'blob' }
      );
      
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', shareInfo.file_name);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      
      // Update download count on screen
      setShareInfo(prev => ({ ...prev, download_count: (prev.download_count || 0) + 1 }));
      triggerAlert('success', 'Download started successfully.');
    } catch (err) {
      triggerAlert('error', 'Invalid password or link validation failed.');
    } finally {
      setShareLoading(false);
    }
  };

  // Helper formats
  const formatBytes = (bytes, decimals = 2) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType) => {
    if (mimeType.startsWith('image/')) return <ImageIcon className="w-5 h-5 text-indigo-600" />;
    if (mimeType.startsWith('video/')) return <Video className="w-5 h-5 text-purple-600" />;
    if (mimeType.startsWith('audio/')) return <Music className="w-5 h-5 text-pink-600" />;
    if (mimeType === 'application/pdf') return <FileText className="w-5 h-5 text-red-600" />;
    if (mimeType.includes('word') || mimeType.includes('text') || mimeType.includes('sheet') || mimeType.includes('excel')) {
      return <FileText className="w-5 h-5 text-emerald-600" />;
    }
    return <File className="w-5 h-5 text-slate-500" />;
  };

  // ==========================================
  // VIEW RENDERER: PUBLIC SHARE PORTAL
  // ==========================================
  if (shareId) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        {/* Global Toast Alert */}
        {alert.message && (
          <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg border text-xs shadow-lg animate-fade-in ${
            alert.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            {alert.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
            {alert.message}
          </div>
        )}

        <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl p-8 text-center animate-fade-in shadow-lg relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-brand rounded-t-xl"></div>
          
          <h2 className="text-xl font-bold text-slate-900 mb-2 flex items-center justify-center gap-2">
            <Folder className="w-6 h-6 text-brand" />
            CloudVault Share
          </h2>
          <p className="text-slate-500 text-xs mb-8">Access the document shared with you</p>

          {shareLoading && !shareInfo ? (
            <div className="py-12 text-slate-500 text-sm">Loading document details...</div>
          ) : shareInfo ? (
            <div className="flex flex-col items-center">
              <div className="p-4 bg-slate-100 rounded-lg mb-4 border border-slate-200">
                {getFileIcon(shareInfo.file_type)}
              </div>
              <h3 className="text-sm font-semibold text-slate-800 truncate max-w-xs mb-1">{shareInfo.file_name}</h3>
              <p className="text-xs text-slate-500 mb-6 font-mono">{formatBytes(shareInfo.file_size)}</p>

              {shareInfo.requires_password && (
                <div className="w-full mb-6 text-left">
                  <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Password Protected</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input
                      type="password"
                      placeholder="Enter password to access"
                      value={sharePassword}
                      onChange={(e) => setSharePassword(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 bg-slate-50"
                    />
                  </div>
                </div>
              )}

              {shareInfo.expires_at && (
                <div className="flex items-center gap-1.5 text-xs text-amber-700 mb-6 bg-amber-50 px-3 py-1.5 border border-amber-200 rounded-lg">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Link Expires: {new Date(shareInfo.expires_at).toLocaleString()}</span>
                </div>
              )}

              <button
                onClick={handlePublicDownload}
                disabled={shareLoading}
                className="w-full py-2.5 rounded-lg bg-brand hover:bg-brand-600 disabled:bg-brand-400 text-white text-xs font-bold shadow-sm hover:shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                {shareLoading ? 'Downloading...' : 'Download Document'}
              </button>
            </div>
          ) : (
            <div className="py-8">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-sm font-semibold text-slate-800 mb-2">Invalid or Expired Link</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto mb-6">
                This share link does not exist, has expired, or has reached its maximum download limit.
              </p>
            </div>
          )}

          <div className="mt-8 border-t border-slate-100 pt-4 text-center">
            <button 
              onClick={() => {
                window.location.pathname = '/';
              }}
              className="text-xs text-slate-500 hover:text-slate-800 transition-all font-medium"
            >
              Sign In to CloudVault
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW RENDERER: AUTHENTICATION SCREEN
  // ==========================================
  if (!token) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        {/* Global Toast Alert */}
        {alert.message && (
          <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg border text-xs shadow-lg animate-fade-in ${
            alert.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            {alert.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
            {alert.message}
          </div>
        )}

        <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl p-8 shadow-md relative overflow-hidden animate-fade-in">
          <div className="absolute top-0 left-0 w-full h-1 bg-brand"></div>
          
          <div className="flex justify-center mb-6">
            <span className="p-3 bg-brand/10 rounded-lg text-brand">
              <Folder className="w-8 h-8" />
            </span>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-slate-900 text-center mb-1">
            {authIsLogin ? 'CloudVault' : 'Join CloudVault'}
          </h2>
          <p className="text-slate-500 text-xs text-center mb-8">
            {authIsLogin ? 'Access your files securely' : 'Sign up to create your document cabinet'}
          </p>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {!authIsLogin && (
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Username</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. johndoe"
                  value={authUsername}
                  onChange={(e) => setAuthUsername(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 bg-slate-50"
                />
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Email Address</label>
              <input
                type="email"
                required
                placeholder="john@example.com"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Password</label>
              <input
                type="password"
                required
                placeholder="Enter password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 bg-slate-50"
              />
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-2.5 rounded-lg bg-brand hover:bg-brand-600 disabled:bg-brand-400 text-white text-xs font-bold shadow-sm active:scale-95 transition-all flex items-center justify-center"
            >
              {authLoading ? 'Please wait...' : authIsLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-4 text-center">
            <button
              onClick={() => setAuthIsLogin(!authIsLogin)}
              className="text-xs text-slate-500 hover:text-brand font-medium transition-all"
            >
              {authIsLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW RENDERER: PROTECTED DASHBOARD SYSTEM
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-800">
      
      {/* Toast alert */}
      {alert.message && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg border text-xs shadow-lg animate-fade-in ${
          alert.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {alert.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
          {alert.message}
        </div>
      )}

      {/* Side Navigation Bar */}
      <aside className="w-full md:w-64 bg-white border-r border-slate-200 md:flex md:flex-col shrink-0 shadow-sm">
        
        {/* Nav Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-brand/10 rounded-lg text-brand">
              <Folder className="w-5 h-5" />
            </span>
            <span className="font-bold text-slate-900 tracking-tight text-base">CloudVault</span>
          </div>
          <button 
            className="md:hidden p-2 text-slate-500 hover:text-slate-800"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* User Identity Panel */}
        <div className="px-6 py-4 border-b border-slate-100 hidden md:block bg-slate-50/50">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-brand-100 border border-brand-200 text-brand text-xs font-bold flex items-center justify-center">
              {user.username.charAt(0).toUpperCase()}
            </span>
            <div className="truncate">
              <p className="text-xs font-bold text-slate-900 truncate">{user.username}</p>
              <p className="text-[10px] text-slate-500 font-medium capitalize flex items-center gap-1">
                <Shield className="w-2.5 h-2.5 text-slate-400" />
                {user.role} Account
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className={`px-4 py-6 space-y-1 ${isMobileMenuOpen ? 'block' : 'hidden md:block'} flex-1`}>
          <button
            onClick={() => { setCurrentTab('dashboard'); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
              currentTab === 'dashboard' ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <HardDrive className="w-4 h-4 text-slate-400" />
            Overview
          </button>
          
          <button
            onClick={() => { setCurrentTab('files'); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
              currentTab === 'files' ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Folder className="w-4 h-4 text-slate-400" />
            File Explorer
          </button>

          <button
            onClick={() => { setCurrentTab('share-center'); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
              currentTab === 'share-center' ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Share2 className="w-4 h-4 text-slate-400" />
            Share Links
          </button>

          <button
            onClick={() => { setCurrentTab('activity-logs'); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
              currentTab === 'activity-logs' ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Activity className="w-4 h-4 text-slate-400" />
            Activity Log
          </button>

          <button
            onClick={() => { setCurrentTab('profile'); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
              currentTab === 'profile' ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <User className="w-4 h-4 text-slate-400" />
            Profile Settings
          </button>

          {user.role === 'admin' && (
            <div className="pt-6 mt-4 border-t border-slate-100">
              <span className="block px-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Management</span>
              <button
                onClick={() => { setCurrentTab('admin'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  currentTab === 'admin' ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Users className="w-4 h-4 text-slate-400" />
                Admin Panel
              </button>
            </div>
          )}
        </nav>

        {/* Sidebar Footer Logout */}
        <div className="p-4 border-t border-slate-100 hidden md:block">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Panel Area */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto max-h-screen">
        
        {/* TOP METRICS & TITLE */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 capitalize">{currentTab.replace('-', ' ')}</h1>
            <p className="text-xs text-slate-500 mt-1">Hello, {user.username} • {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          
          <div className="flex gap-3">
            <input 
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current.click()}
              disabled={isUploading}
              className="inline-flex items-center px-4 py-2 bg-brand hover:bg-brand-600 disabled:bg-brand-400 active:scale-95 transition-all text-white text-xs font-bold rounded-lg shadow-sm"
            >
              <UploadCloud className="w-4.5 h-4.5 mr-2" />
              {isUploading ? `Uploading ${uploadProgress}%` : 'Upload File'}
            </button>
          </div>
        </header>

        {/* ==========================================
            TAB CONTENT: DASHBOARD OVERVIEW
           ========================================== */}
        {currentTab === 'dashboard' && (
          <div className="space-y-6 animate-fade-in">
            
            {/* Storage Usage banner */}
            <GlassCard>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-1.5">
                    <HardDrive className="w-4 h-4 text-brand" />
                    Storage Space
                  </h3>
                  <p className="text-3xl font-black text-slate-900">
                    {formatBytes(files.reduce((acc, curr) => acc + curr.size, 0))}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1 font-medium">Demo limit: 1.00 GB</p>
                </div>
                
                {/* ProgressBar */}
                <div className="w-full md:w-80">
                  <div className="flex justify-between text-xs font-semibold text-slate-500 mb-2">
                    <span>Used space</span>
                    <span>{Math.min(100, ((files.reduce((acc, curr) => acc + curr.size, 0) / (1024*1024*1024)) * 100).toFixed(2))}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                    <div 
                      className="h-full bg-brand rounded-full"
                      style={{ width: `${Math.max(1.5, Math.min(100, (files.reduce((acc, curr) => acc + curr.size, 0) / (1024*1024*1024)) * 100))}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* Quick stats grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <GlassCard className="flex items-center gap-4 border-l-4 border-l-brand">
                <span className="p-3 bg-brand/10 rounded-lg text-brand"><Folder className="w-5 h-5" /></span>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">My Documents</p>
                  <p className="text-xl font-bold text-slate-900 mt-0.5">{files.length}</p>
                </div>
              </GlassCard>

              <GlassCard className="flex items-center gap-4">
                <span className="p-3 bg-emerald-100 rounded-lg text-emerald-600"><Download className="w-5 h-5" /></span>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">File Downloads</p>
                  <p className="text-xl font-bold text-slate-900 mt-0.5">{files.reduce((acc, curr) => acc + (curr.download_count || 0), 0)}</p>
                </div>
              </GlassCard>

              <GlassCard className="flex items-center gap-4">
                <span className="p-3 bg-indigo-100 rounded-lg text-indigo-600"><Share2 className="w-5 h-5" /></span>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Shared Files</p>
                  <p className="text-xl font-bold text-slate-900 mt-0.5">{files.length > 0 ? 'Active' : 'None'}</p>
                </div>
              </GlassCard>
            </div>

            {/* Split layout: Recent files vs activity log */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              
              {/* Recent files */}
              <GlassCard className="lg:col-span-3 p-0 overflow-hidden">
                <div className="flex justify-between items-center p-6 border-b border-slate-100">
                  <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Recent Documents</h3>
                  <button 
                    onClick={() => setCurrentTab('files')}
                    className="text-xs text-brand hover:text-brand-600 flex items-center font-semibold"
                  >
                    View All
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {files.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-xs">No documents uploaded yet.</div>
                ) : (
                  <div className="divide-y divide-slate-100 px-6">
                    {files.map(f => (
                      <div key={f.id} className="py-3 flex justify-between items-center group">
                        <div className="flex items-center gap-3 truncate">
                          <span className="p-1.5 bg-slate-50 rounded-lg">{getFileIcon(f.type)}</span>
                          <span className="text-xs text-slate-700 font-medium truncate max-w-xs">{f.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-slate-400 font-mono">{formatBytes(f.size)}</span>
                          <button 
                            onClick={() => setPreviewingFile(f)}
                            className="p-1 text-slate-400 hover:text-slate-800 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-slate-50"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </GlassCard>

              {/* Activity feeds */}
              <GlassCard className="lg:col-span-2">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Activity Feed</h3>
                  <button 
                    onClick={() => setCurrentTab('activity-logs')}
                    className="text-xs text-slate-400 hover:text-slate-800 font-medium"
                  >
                    View Log
                  </button>
                </div>

                {recentLogs.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-xs">No activity recorded.</div>
                ) : (
                  <div className="space-y-4">
                    {recentLogs.map((log, idx) => (
                      <div key={idx} className="flex gap-3 text-xs leading-relaxed">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-brand shrink-0"></span>
                        <div>
                          <p className="font-semibold text-slate-800">{log.action}</p>
                          <p className="text-[10px] text-slate-500">{log.details}</p>
                          <span className="text-[9px] text-slate-400 font-mono">{new Date(log.created_at).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </GlassCard>
            </div>
          </div>
        )}

        {/* ==========================================
            TAB CONTENT: FILE EXPLORER
           ========================================== */}
        {currentTab === 'files' && (
          <div className="space-y-6 animate-fade-in">
            
            {/* Toolbar search & filters */}
            <GlassCard className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 bg-slate-50"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <select 
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-brand"
                  >
                    <option value="">All Categories</option>
                    <option value="image">Images</option>
                    <option value="pdf">PDFs</option>
                    <option value="document">Documents</option>
                    <option value="other">Others</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  <select 
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-brand"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="size-desc">Largest Size</option>
                    <option value="size-asc">Smallest Size</option>
                  </select>
                </div>

                <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white">
                  <button 
                    onClick={() => setLayoutMode('grid')}
                    className={`p-1.5 transition-all ${layoutMode === 'grid' ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-800'}`}
                  >
                    <Grid className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => setLayoutMode('list')}
                    className={`p-1.5 transition-all ${layoutMode === 'list' ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-800'}`}
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </GlassCard>

            {loadingFiles ? (
              <div className="text-center py-20 text-slate-500 text-sm">Loading files...</div>
            ) : files.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-xl border border-slate-200 border-dashed">
                <Folder className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-sm font-semibold text-slate-700 mb-1">No Files Found</h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">Upload new documents using the button at the top right.</p>
              </div>
            ) : layoutMode === 'grid' ? (
              
              /* Grid Layout */
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {files.map(f => (
                  <GlassCard key={f.id} className="relative group overflow-hidden border-slate-200">
                    <div className="flex items-start justify-between mb-4">
                      <span className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">{getFileIcon(f.type)}</span>
                      
                      {/* Action Triggers */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button
                          onClick={() => setPreviewingFile(f)}
                          title="Preview"
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDownload(f)}
                          title="Download"
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => { setSharingFile(f); setCreatedShareLink(''); }}
                          title="Share"
                          className="p-1.5 text-slate-500 hover:text-brand hover:bg-brand-50/50 rounded-lg transition-all"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteFile(f.id)}
                          title="Delete"
                          className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    
                    <h3 className="text-xs font-semibold text-slate-800 truncate pr-6 mb-1">{f.name}</h3>
                    <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono mt-4 pt-3 border-t border-slate-100">
                      <span>{formatBytes(f.size)}</span>
                      <span>{new Date(f.created_at).toLocaleDateString()}</span>
                    </div>
                  </GlassCard>
                ))}
              </div>
            ) : (
              
              /* List Layout */
              <GlassCard className="p-0 overflow-hidden border-slate-200">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-150">
                        <th className="p-4">Name</th>
                        <th className="p-4">Size</th>
                        <th className="p-4">Type</th>
                        <th className="p-4">Downloads</th>
                        <th className="p-4">Uploaded</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {files.map(f => (
                        <tr key={f.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 font-semibold text-slate-800">
                            <div className="flex items-center gap-3 truncate max-w-xs">
                              {getFileIcon(f.type)}
                              <span className="truncate">{f.name}</span>
                            </div>
                          </td>
                          <td className="p-4 text-slate-600 font-mono">{formatBytes(f.size)}</td>
                          <td className="p-4 text-slate-500 truncate max-w-[120px]">{f.type}</td>
                          <td className="p-4 text-slate-600 font-mono">{f.download_count || 0}</td>
                          <td className="p-4 text-slate-500">{new Date(f.created_at).toLocaleDateString()}</td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setPreviewingFile(f)}
                                className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDownload(f)}
                                className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => { setSharingFile(f); setCreatedShareLink(''); }}
                                className="p-1.5 text-slate-500 hover:text-brand rounded-lg hover:bg-brand-50 transition-colors"
                              >
                                <Share2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteFile(f.id)}
                                className="p-1.5 text-slate-500 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </GlassCard>
            )}
          </div>
        )}

        {/* ==========================================
            TAB CONTENT: SHARE CENTER (MY SHARES)
           ========================================== */}
        {currentTab === 'share-center' && (
          <div className="space-y-6 animate-fade-in">
            <GlassCard className="p-0 overflow-hidden border-slate-200">
              <div className="p-6 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-800">Shared Links</h3>
                <p className="text-xs text-slate-500 mt-1">Manage public URL handles generated to share individual documents.</p>
              </div>

              {myShares.length === 0 ? (
                <div className="text-center py-20 text-slate-400 text-xs">No active shared links found. Select Share on a file to start.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-150">
                        <th className="p-4">File Name</th>
                        <th className="p-4">Link Path</th>
                        <th className="p-4">Expires</th>
                        <th className="p-4">Security</th>
                        <th className="p-4">Downloads</th>
                        <th className="p-4 text-right">Revoke</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {myShares.map(link => (
                        <tr key={link.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 text-slate-800 font-semibold truncate max-w-xs">{link.file_name}</td>
                          <td className="p-4">
                            <div className="flex items-center gap-1.5 font-mono text-[10px] text-brand">
                              <span className="truncate max-w-[120px]">{link.id}</span>
                              <button 
                                onClick={() => copyToClipboard(`${window.location.protocol}//${window.location.host}/share/${link.id}`)}
                                className="p-1 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded transition-all"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                          <td className="p-4 text-slate-600">
                            {link.expires_at ? (
                              <span className={`flex items-center gap-1 ${new Date(link.expires_at) < new Date() ? 'text-red-600 font-semibold' : ''}`}>
                                <Clock className="w-3 h-3" />
                                {new Date(link.expires_at).toLocaleString(undefined, {month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'})}
                              </span>
                            ) : (
                              <span className="text-slate-400">Persistent</span>
                            )}
                          </td>
                          <td className="p-4">
                            {link.password ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-semibold border border-emerald-200">
                                <Lock className="w-2.5 h-2.5" />
                                Password
                              </span>
                            ) : (
                              <span className="text-slate-400">Public</span>
                            )}
                          </td>
                          <td className="p-4 font-mono text-slate-500">
                            {link.download_limit ? `${link.download_count} / ${link.download_limit}` : `${link.download_count} / ∞`}
                          </td>
                          <td className="p-4 text-right">
                            <button
                              onClick={() => handleRevokeShare(link.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </GlassCard>
          </div>
        )}

        {/* ==========================================
            TAB CONTENT: AUDIT ACTIVITY LOG
           ========================================== */}
        {currentTab === 'activity-logs' && (
          <div className="space-y-6 animate-fade-in">
            <GlassCard className="p-0 overflow-hidden border-slate-200">
              <div className="p-6 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-800">Security Audit Logs</h3>
                <p className="text-xs text-slate-500 mt-1">Audit log records document access history, uploads, and account changes.</p>
              </div>

              {recentLogs.length === 0 ? (
                <div className="text-center py-20 text-slate-400 text-xs">No log history found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-150">
                        <th className="p-4">Action</th>
                        <th className="p-4">Details</th>
                        <th className="p-4">IP Address</th>
                        <th className="p-4">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[11px] text-slate-700">
                      {recentLogs.map((log, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 font-bold">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                              log.action.includes('DELETE') ? 'bg-red-50 text-red-700 border-red-200' :
                              log.action.includes('UPLOAD') ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                              log.action.includes('LOGIN') ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              'bg-slate-100 text-slate-700 border-slate-200'
                            }`}>
                              {log.action}
                            </span>
                          </td>
                          <td className="p-4 text-slate-600">{log.details}</td>
                          <td className="p-4 font-mono text-slate-400">{log.ip_address}</td>
                          <td className="p-4 text-slate-500">{new Date(log.created_at).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </GlassCard>
          </div>
        )}

        {/* ==========================================
            TAB CONTENT: PROFILE SETTINGS
           ========================================== */}
        {currentTab === 'profile' && (
          <div className="max-w-xl space-y-6 animate-fade-in">
            <GlassCard className="border-slate-200">
              <h3 className="text-sm font-semibold text-slate-800 mb-6">Account Settings</h3>
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Username</label>
                  <input
                    type="text"
                    required
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 bg-slate-50"
                  />
                </div>

                <div className="border-t border-slate-100 pt-4 mt-6">
                  <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Change Password</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Current Password</label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={profileCurrPass}
                        onChange={(e) => setProfileCurrPass(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 bg-slate-50"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">New Password</label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={profileNewPass}
                        onChange={(e) => setProfileNewPass(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 bg-slate-50"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={profileLoading}
                  className="w-full py-2.5 rounded-lg bg-brand hover:bg-brand-600 disabled:bg-brand-400 text-white text-xs font-bold shadow-sm"
                >
                  {profileLoading ? 'Saving...' : 'Save Profile Details'}
                </button>
              </form>
            </GlassCard>
          </div>
        )}

        {/* ==========================================
            TAB CONTENT: ADMIN CONSOLE
           ========================================== */}
        {currentTab === 'admin' && user.role === 'admin' && adminStats && (
          <div className="space-y-6 animate-fade-in">
            
            {/* System statistics */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-6">
              <GlassCard className="p-4 border-slate-200 bg-brand/5 border-l-4 border-l-brand">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total Users</p>
                <p className="text-xl font-bold text-slate-800 mt-1">{adminStats.totalUsers}</p>
              </GlassCard>
              <GlassCard className="p-4">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">System Files</p>
                <p className="text-xl font-bold text-slate-800 mt-1">{adminStats.totalFiles}</p>
              </GlassCard>
              <GlassCard className="p-4">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Storage Utilized</p>
                <p className="text-xl font-bold text-slate-800 mt-1 font-mono text-sm leading-none pt-1">
                  {formatBytes(adminStats.totalSize)}
                </p>
              </GlassCard>
              <GlassCard className="p-4">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Downloads</p>
                <p className="text-xl font-bold text-slate-800 mt-1">{adminStats.totalDownloads}</p>
              </GlassCard>
              <GlassCard className="p-4">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Active Shares</p>
                <p className="text-xl font-bold text-slate-800 mt-1">{adminStats.totalShares}</p>
              </GlassCard>
            </div>

            {/* Sub-layout: Users list & Files auditing */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Users administration */}
              <GlassCard className="p-0 overflow-hidden border-slate-200">
                <div className="p-6 border-b border-slate-100">
                  <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Users Directory</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-150">
                        <th className="p-3">User</th>
                        <th className="p-3">Role</th>
                        <th className="p-3">Joined</th>
                        <th className="p-3 text-right">Delete</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {adminUsers.map(u => (
                        <tr key={u.id} className="hover:bg-slate-50/50">
                          <td className="p-3 font-semibold text-slate-800">
                            <div>
                              <p>{u.username}</p>
                              <p className="text-[9px] text-slate-400 font-mono mt-0.5">{u.email}</p>
                            </div>
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                              u.role === 'admin' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}>
                              {u.role.toUpperCase()}
                            </span>
                          </td>
                          <td className="p-3 text-slate-500">{new Date(u.created_at).toLocaleDateString()}</td>
                          <td className="p-3 text-right">
                            <button
                              disabled={u.id === user.id}
                              onClick={() => adminDeleteUser(u.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-30 disabled:hover:bg-transparent"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </GlassCard>

              {/* Files audit directory */}
              <GlassCard className="p-0 overflow-hidden border-slate-200">
                <div className="p-6 border-b border-slate-100">
                  <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">All System Files</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-150">
                        <th className="p-3">File</th>
                        <th className="p-3">Uploaded By</th>
                        <th className="p-3">Size</th>
                        <th className="p-3 text-right">Purge</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {adminFiles.map(af => (
                        <tr key={af.id} className="hover:bg-slate-50/50">
                          <td className="p-3 font-semibold text-slate-800 truncate max-w-[120px]">{af.name}</td>
                          <td className="p-3 text-slate-500 font-medium text-[10px]">{af.owner_username || `User ID: ${af.user_id}`}</td>
                          <td className="p-3 text-slate-600 font-mono">{formatBytes(af.size)}</td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => adminDeleteFile(af.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </GlassCard>
            </div>
          </div>
        )}
      </main>

      {/* ==========================================
          SUB-MODAL: FILE PREVIEWER
         ========================================== */}
      {previewingFile && (
        <FilePreviewModal
          file={previewingFile}
          onClose={() => setPreviewingFile(null)}
          onDownload={handleDownload}
        />
      )}

      {/* ==========================================
          SUB-MODAL: ACCESS KEY CONFIGURATOR (SHARE)
         ========================================== */}
      {sharingFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-xl p-6 shadow-xl animate-fade-in">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <Share2 className="w-4 h-4 text-brand" />
                Generate Secure Link
              </h3>
              <button 
                onClick={() => setSharingFile(null)}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-all"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            <p className="text-[11px] text-slate-600 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-200/60 leading-relaxed truncate">
              File: <span className="font-semibold text-slate-800">{sharingFile.name}</span>
            </p>

            {createdShareLink ? (
              <div className="space-y-4">
                <div className="p-3 bg-brand/5 border border-brand/20 rounded-lg">
                  <p className="text-[10px] font-bold text-brand uppercase tracking-wider mb-1">Access URL</p>
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <span className="text-[10px] text-slate-600 font-mono truncate select-all">{createdShareLink}</span>
                    <button 
                      onClick={() => copyToClipboard(createdShareLink)}
                      className="p-2 bg-brand text-white rounded-lg hover:bg-brand-600 active:scale-95 transition-all text-xs font-bold shrink-0"
                    >
                      Copy
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => setSharingFile(null)}
                  className="w-full py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateShareLink} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Expiration</label>
                    <select
                      value={shareExpires}
                      onChange={(e) => setShareExpires(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-850 focus:outline-none focus:border-brand"
                    >
                      <option value="1">1 Hour</option>
                      <option value="24">24 Hours</option>
                      <option value="72">72 Hours</option>
                      <option value="never">Never Expire</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Download Limit</label>
                    <input
                      type="number"
                      placeholder="e.g. 5 (Infinite if empty)"
                      value={shareLimit}
                      onChange={(e) => setShareLimit(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-850 focus:outline-none focus:border-brand"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Require Password (Optional)</label>
                  <input
                    type="password"
                    placeholder="Enter security password"
                    value={sharePass}
                    onChange={(e) => setSharePass(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-850 focus:outline-none focus:border-brand"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2 rounded-lg bg-brand hover:bg-brand-600 text-white text-xs font-bold shadow-sm active:scale-95 transition-all"
                >
                  Generate Share Link
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
