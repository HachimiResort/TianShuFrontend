"use client";
import React, { useRef, useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Play, Pause, SkipBack, SkipForward } from "lucide-react";
import { useTheme } from "@/components/theme-context";

const MusicPlayer = () => {
    const musicList = [
        "/music/不再曼波.mp3",
        "/music/哈基米的夏天.mp3",
        "/music/哈雪大冒险.flac",
        "/music/梦中的哈基米.mp3"
    ];

    const audioRef = useRef<HTMLAudioElement>(null);
    const progressBarRef = useRef<HTMLDivElement>(null);
    const albumCoverRef = useRef<HTMLImageElement>(null);

    const [isPlaying, setIsPlaying] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isReady, setIsReady] = useState(false); // 新增：音频是否准备好
    const { theme } = useTheme();

    const getSongName = (filePath: string) => {
        const fileName = filePath.split('/').pop();
        if (fileName) {
            return fileName.split('.')[0];
        }
        return "";
    };

    // 格式化时间（秒转 MM:SS 格式）
    const formatTime = (seconds: number) => {
        if (isNaN(seconds) || !isFinite(seconds)) return "0:00";
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    // 更新播放进度
    const updateProgress = () => {
        if (audioRef.current) {
            const currentAudioTime = audioRef.current.currentTime;
            const audioDuration = audioRef.current.duration || 0;

            // 确保只在时间变化时更新状态，避免不必要的渲染
            if (currentAudioTime !== currentTime) {
                setCurrentTime(currentAudioTime);
            }

            if (audioDuration !== duration) {
                setDuration(audioDuration);
            }

            if (progressBarRef.current) {
                const progressPercent = (currentAudioTime / audioDuration) * 100;
                progressBarRef.current.style.width = `${progressPercent}%`;
            }
        }
    };

    // 监听currentIndex变化，更新音频源
    useEffect(() => {
        if (audioRef.current && musicList[currentIndex]) {
            setIsReady(false);

            // 保存当前播放状态和时间
            const wasPlaying = isPlaying;
            const savedTime = audioRef.current.currentTime;

            // 重置音频
            audioRef.current.pause();
            audioRef.current.src = musicList[currentIndex];
            audioRef.current.load();

            audioRef.current.onloadedmetadata = () => {
                if (audioRef.current) {
                    // 恢复之前的播放时间
                    if (savedTime > 0) {
                        audioRef.current.currentTime = savedTime;
                    }

                    setDuration(audioRef.current.duration || 0);

                    setIsReady(true);

                    // 只有在之前是播放状态且当前仍要求播放时才继续播放
                    if (wasPlaying && isPlaying) {
                        audioRef.current.play().catch(err => {
                            console.error("播放失败:", err);
                            setIsPlaying(false);
                        });
                    }
                }
            };
        }
    }, [currentIndex]);

    // 监听播放状态变化
    useEffect(() => {
        if (!audioRef.current || !isReady) return;

        if (isPlaying) {
            audioRef.current.play().catch(err => {
                console.error("播放失败:", err);
                setIsPlaying(false);
            });
        } else {
            audioRef.current.pause();
        }
    }, [isPlaying, isReady]);

    // 监听播放进度
    useEffect(() => {
        const audioElement = audioRef.current;
        if (!audioElement) return;

        const update = () => updateProgress();
        audioElement.addEventListener('timeupdate', update);

        return () => {
            audioElement.removeEventListener('timeupdate', update);
        };
    }, []);

    // 添加对ended事件的监听（自动播放下一首）
    useEffect(() => {
        const audioElement = audioRef.current;
        if (!audioElement) return;

        const handleEnded = () => {
            setCurrentIndex((prevIndex) => (prevIndex + 1) % musicList.length);
        };

        audioElement.addEventListener('ended', handleEnded);
        return () => {
            audioElement.removeEventListener('ended', handleEnded);
        };
    }, []);

    // 新增：监听暂停事件
    useEffect(() => {
        const audioElement = audioRef.current;
        if (!audioElement) return;

        const handlePause = () => {
            // 确保暂停时更新进度
            updateProgress();
        };

        audioElement.addEventListener('pause', handlePause);
        return () => {
            audioElement.removeEventListener('pause', handlePause);
        };
    }, []);

    // 处理进度条点击
    const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!progressBarRef.current || !audioRef.current || !isReady) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const clickPosition = e.clientX - rect.left;
        const progressBarWidth = rect.width;
        const seekPercentage = clickPosition / progressBarWidth;

        const seekTime = seekPercentage * (audioRef.current.duration || 0);
        audioRef.current.currentTime = seekTime;
        updateProgress();
    };

    // 播放/暂停音乐
    const togglePlay = () => {
        if (!audioRef.current || !isReady) return;

        setIsPlaying(prev => !prev);
    };

    // 播放上一首
    const playPrevious = () => {
        if (!isReady) return;

        setCurrentIndex((prevIndex) => (prevIndex - 1 + musicList.length) % musicList.length);
        setIsPlaying(true);
    };

    // 播放下一首
    const playNext = () => {
        if (!isReady) return;

        setCurrentIndex((prevIndex) => (prevIndex + 1) % musicList.length);
        setIsPlaying(true);
    };

    return (
        <div className={`w-full max-w-sm mx-auto ${theme === 'light' ? 'bg-white' : 'bg-black'} rounded-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl group`}>
            {/* 专辑封面区域 */}
            <div className="relative h-64 overflow-hidden flex items-center justify-center">
                <img
                    ref={albumCoverRef}
                    src="hachimitsu.svg"
                    alt={getSongName(musicList[currentIndex])}
                    className="w-48 h-48 object-cover transition-transform duration-700 group-hover:scale-110"
                    style={{
                        animation: isPlaying ? 'rotate 20s linear infinite' : 'none'
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>

                {/* 播放按钮覆盖层 */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <button
                        onClick={togglePlay}
                        className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white transform transition-transform duration-300 hover:scale-110"
                    >
                        {isPlaying ? (
                            <Pause className="w-4 h-4 mr-2" />
                        ) : (
                            <Play className="w-4 h-4 mr-2" />
                        )}
                    </button>
                </div>
            </div>

            {/* 歌曲信息和控制区域 */}
            <div className="p-5">
                {/* 歌曲名称 */}
                <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-450 truncate">{getSongName(musicList[currentIndex])}</h3>
                </div>

                {/* 进度条 */}
                <div className="mb-4">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                    </div>
                    <div
                        className="h-1.5 bg-gray-300 rounded-full overflow-hidden cursor-pointer group-hover:bg-gray-400 transition-colors"
                        onClick={handleProgressClick}
                    >
                        <div
                            ref={progressBarRef}
                            className="h-full bg-primary rounded-full transition-all duration-100"
                            style={{ width: (duration > 0 && currentTime >= 0) ? `${(currentTime / duration) * 100}%` : '0%' }}
                        />
                    </div>
                </div>

                {/* 控制按钮 */}
                <div className="flex items-center justify-between">
                    <Button
                        variant="ghost"
                        className="text-gray-500 hover:text-primary transition-colors"
                        onClick={playPrevious}
                    >
                        <SkipBack className="w-4 h-4 mr-2" />
                    </Button>

                    <Button
                        variant="default"
                        className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg transform transition-all duration-300 hover:scale-105 active:scale-95"
                        style={{ backgroundColor: isPlaying ? '#2D3748' : '#4A5568' }}
                        onClick={togglePlay}
                    >
                        {isPlaying ? (
                            <Pause className="w-4 h-4 text-white" />
                        ) : (
                            <Play className="w-4 h-4 text-white" />
                        )}
                    </Button>

                    <Button
                        variant="ghost"
                        className="text-gray-500 hover:text-primary transition-colors"
                        onClick={playNext}
                    >
                        <SkipForward className="w-4 h-4 mr-2" />
                    </Button>
                </div>

                {/* 隐藏的音频元素 */}
                <audio ref={audioRef} src={musicList[currentIndex]} preload="metadata"></audio>
            </div>

            {/* 添加旋转动画 */}
            <style>{`
        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    );
};

export default MusicPlayer;