'use client';

import Script from 'next/script';
import { useState, useRef, useCallback, useEffect } from 'react';

type SessionUser = {
  email: string;
  name: string;
  picture: string;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: { theme?: string; size?: string; text?: string; shape?: string }
          ) => void;
        };
      };
    };
  }
}

export default function Home() {
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const [original, setOriginal] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [user, setUser] = useState<SessionUser | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const googleButtonRef = useRef<HTMLDivElement>(null);

  const handleGoogleLogin = useCallback(async (credential: string) => {
    setError(null);

    const res = await fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(data.error || '登录失败');
      return;
    }

    setLoggedIn(true);
    setUser(data.user ?? null);
  }, []);

  const handleLogout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setLoggedIn(false);
    setUser(null);
    setOriginal(null);
    setResult(null);
    setError(null);
    if (googleButtonRef.current) googleButtonRef.current.innerHTML = '';
  }, []);

  const renderGoogleButton = useCallback(() => {
    if (!window.google || !googleButtonRef.current || !googleClientId) {
      return;
    }

    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: ({ credential }) => handleGoogleLogin(credential),
    });

    googleButtonRef.current.innerHTML = '';
    window.google.accounts.id.renderButton(googleButtonRef.current, {
      theme: 'outline',
      size: 'large',
      text: 'signin_with',
      shape: 'pill',
    });
  }, [googleClientId, handleGoogleLogin]);

  useEffect(() => {
    const checkSession = async () => {
      const res = await fetch('/api/auth/session', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      setLoggedIn(res.ok);
      setUser(res.ok ? data.user ?? null : null);
      setCheckingSession(false);
    };

    checkSession();
  }, []);

  useEffect(() => {
    if (!checkingSession && !loggedIn && window.google) {
      renderGoogleButton();
    }
  }, [checkingSession, loggedIn, renderGoogleButton]);

  const processFile = useCallback(async (file: File) => {
    if (!loggedIn) {
      setError('请先使用 Google 登录');
      return;
    }

    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setError('只支持 JPG、PNG、WebP 格式');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('图片大小不能超过 10MB');
      return;
    }

    setOriginal(URL.createObjectURL(file));
    setResult(null);
    setError(null);
    setLoading(true);

    try {
      const form = new FormData();
      form.append('image', file);
      const res = await fetch('/api/remove-background', { method: 'POST', body: form });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || '处理失败');
      }
      const blob = await res.blob();
      setResult(URL.createObjectURL(blob));
    } catch (e) {
      setError(e instanceof Error ? e.message : '处理失败，请重试');
    } finally {
      setLoading(false);
    }
  }, [loggedIn]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const download = () => {
    if (!result) return;
    const a = document.createElement('a');
    a.href = result;
    a.download = 'removed-bg.png';
    a.click();
  };

  const reset = () => {
    setOriginal(null);
    setResult(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={renderGoogleButton}
      />
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-16">
          <div className="mb-10 flex items-center justify-between gap-4">
            <div className="text-sm font-semibold text-gray-900">Image Background Remover</div>
            <div className="flex min-h-10 items-center">
              {checkingSession ? (
                <div className="text-sm text-gray-400">检查登录中...</div>
              ) : loggedIn ? (
                <div className="flex items-center gap-3 rounded-full bg-white px-3 py-2 shadow-sm">
                  {user?.picture ? (
                    <img src={user.picture} alt={user.name || user.email} className="h-9 w-9 rounded-full" />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600">
                      {(user?.name || user?.email || 'G').slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-gray-900">{user?.name || 'Google 用户'}</div>
                    <div className="truncate text-xs text-gray-500">{user?.email}</div>
                  </div>
                  <button onClick={handleLogout} className="rounded-full bg-gray-100 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-200">
                    退出
                  </button>
                </div>
              ) : (
                <div ref={googleButtonRef} />
              )}
            </div>
          </div>

          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              AI 一键去除图片背景
            </h1>
            <p className="text-lg text-gray-500">
              3 秒抠图，无需 PS，支持 JPG、PNG、WebP，最大 10MB。
            </p>
          </div>

          {!original && (
            <div
              className={`border-2 border-dashed rounded-2xl p-16 text-center transition-colors ${
                dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white'
              } ${loggedIn ? 'cursor-pointer hover:border-blue-400' : 'cursor-not-allowed opacity-80'}`}
              onClick={() => {
                if (!loggedIn) {
                  setError('请先使用右上角 Google 登录');
                  return;
                }
                inputRef.current?.click();
              }}
              onDragOver={(e) => {
                e.preventDefault();
                if (!loggedIn) return;
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
            >
              <div className="text-5xl mb-4">🖼️</div>
              <p className="text-gray-600 text-lg mb-2">拖拽图片到这里，或点击上传</p>
              <p className="text-gray-400 text-sm">支持 JPG、PNG、WebP，最大 10MB</p>
              {!loggedIn && <p className="mt-3 text-sm text-blue-500">先完成 Google 登录才能开始去背景</p>}
              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); }}
              />
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-center">
              {error}
            </div>
          )}

          {loading && (
            <div className="mt-8 text-center">
              <div className="inline-block w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-gray-500">正在去除背景...</p>
            </div>
          )}

          {original && !loading && (
            <div className="mt-8">
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                  <p className="text-sm text-gray-400 mb-3 text-center">原图</p>
                  <img src={original} alt="原图" className="w-full rounded-xl object-contain max-h-72" />
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                  <p className="text-sm text-gray-400 mb-3 text-center">去背景后</p>
                  {result ? (
                    <img src={result} alt="去背景" className="w-full rounded-xl object-contain max-h-72" style={{ background: 'repeating-conic-gradient(#ccc 0% 25%, white 0% 50%) 0 0 / 20px 20px' }} />
                  ) : (
                    <div className="w-full max-h-72 flex items-center justify-center text-gray-300 rounded-xl bg-gray-50 h-48">等待处理</div>
                  )}
                </div>
              </div>
              <div className="flex gap-4 mt-6 justify-center">
                {result && (
                  <button onClick={download} className="px-8 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors">
                    下载 PNG
                  </button>
                )}
                <button onClick={reset} className="px-8 py-3 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200 transition-colors">
                  重新上传
                </button>
              </div>
            </div>
          )}

          <div className="mt-20">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">常见问题</h2>
            <div className="space-y-4">
              {[
                { q: '图片会被存储吗？', a: '不会。图片仅在处理时临时传输，不存储在任何服务器上。' },
                { q: '为什么要先登录？', a: 'Google 登录用于限制滥用，只有登录后才能调用去背景接口。' },
                { q: '支持哪些格式？', a: '支持 JPG、PNG、WebP 格式，文件大小不超过 10MB。' },
                { q: '处理结果是什么格式？', a: '下载的文件是透明背景的 PNG 格式。' },
              ].map((item, i) => (
                <div key={i} className="bg-white rounded-xl p-6 shadow-sm">
                  <p className="font-medium text-gray-800 mb-2">{item.q}</p>
                  <p className="text-gray-500">{item.a}</p>
                </div>
              ))}
            </div>
          </div>

          <footer className="mt-16 text-center text-gray-400 text-sm">
            图片仅用于处理，不做任何存储。
          </footer>
        </div>
      </main>
    </>
  );
}
