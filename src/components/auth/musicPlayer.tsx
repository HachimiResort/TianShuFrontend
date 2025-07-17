"use client";
import React, { useRef, useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Play, Pause, SkipBack, SkipForward, ChevronUp, ChevronDown } from "lucide-react";
import { useTheme } from "@/components/theme-context";

const MusicPlayer = () => {
    const musicList = [
        "/music/不再曼波.mp3",
        "/music/哈基米AM.flac",
        "/music/基基侠.mp3",
        "/music/有时哈基米.mp3",
        "/music/哈基米的夏天.mp3",
        "/music/舌尖上的哈基米.flac",
        "/music/跳楼基.mp3",
        "/music/进击的哈基米.mp3",
        "/music/哈雪大冒险.flac",
        "/music/梦中的哈基米.mp3"
    ];

    const audioRef = useRef<HTMLAudioElement>(null);
    const progressBarRef = useRef<HTMLDivElement>(null);
    const albumCoverRef = useRef<HTMLImageElement>(null);
    const animationRef = useRef<number>(0);
    const rotationRef = useRef<number>(0);
    const lastUpdateTimeRef = useRef<number>(0);

    const [isPlaying, setIsPlaying] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isReady, setIsReady] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const { theme } = useTheme();

    // 更新旋转动画
    const updateRotation = (timestamp: number) => {
        if (!lastUpdateTimeRef.current) {
            lastUpdateTimeRef.current = timestamp;
        }

        const deltaTime = timestamp - lastUpdateTimeRef.current;
        lastUpdateTimeRef.current = timestamp;

        rotationRef.current = rotationRef.current + deltaTime * 0.015;

        if (albumCoverRef.current) {
            albumCoverRef.current.style.transform = `rotate(${rotationRef.current}deg)`;
        }

        if (isPlaying) {
            animationRef.current = requestAnimationFrame(updateRotation);
        }
    };

    // 监听播放状态变化
    useEffect(() => {
        if (isPlaying) {
            lastUpdateTimeRef.current = 0;
            animationRef.current = requestAnimationFrame(updateRotation);
        } else {
            cancelAnimationFrame(animationRef.current);
        }

        return () => {
            cancelAnimationFrame(animationRef.current);
        };
    }, [isPlaying]);

    const getSongName = (filePath: string) => {
        const fileName = filePath.split('/').pop();
        if (fileName) {
            return fileName.split('.')[0];
        }
        return "";
    };

    const formatTime = (seconds: number) => {
        if (isNaN(seconds) || !isFinite(seconds)) return "0:00";
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    const updateProgress = () => {
        if (audioRef.current) {
            const currentAudioTime = audioRef.current.currentTime;
            const audioDuration = audioRef.current.duration || 0;

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

    useEffect(() => {
        if (audioRef.current && musicList[currentIndex]) {
            setIsReady(false);

            const wasPlaying = isPlaying;
            const savedTime = audioRef.current.currentTime;

            audioRef.current.pause();
            audioRef.current.src = musicList[currentIndex];
            audioRef.current.load();

            audioRef.current.onloadedmetadata = () => {
                if (audioRef.current) {
                    if (savedTime > 0) {
                        audioRef.current.currentTime = savedTime;
                    }

                    setDuration(audioRef.current.duration || 0);
                    setIsReady(true);

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

    useEffect(() => {
        const audioElement = audioRef.current;
        if (!audioElement) return;

        const update = () => updateProgress();
        audioElement.addEventListener('timeupdate', update);

        return () => {
            audioElement.removeEventListener('timeupdate', update);
        };
    }, []);

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

    useEffect(() => {
        const audioElement = audioRef.current;
        if (!audioElement) return;

        const handlePause = () => {
            updateProgress();
        };

        audioElement.addEventListener('pause', handlePause);
        return () => {
            audioElement.removeEventListener('pause', handlePause);
        };
    }, []);

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

    const togglePlay = () => {
        if (!audioRef.current || !isReady) return;

        setIsPlaying(prev => !prev);
    };

    const playPrevious = () => {
        if (!isReady) return;

        setCurrentIndex((prevIndex) => (prevIndex - 1 + musicList.length) % musicList.length);
        setIsPlaying(true);
    };

    const playNext = () => {
        if (!isReady) return;

        setCurrentIndex((prevIndex) => (prevIndex + 1) % musicList.length);
        setIsPlaying(true);
    };

    const toggleCollapse = () => {
        setIsCollapsed(prev => !prev);
    };

    return (
        <div className={`w-full max-w-sm mx-auto ${theme === 'light' ? 'bg-white' : 'bg-black'} rounded-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl group`}>
            {/* Collapse/Expand Button */}
            <div className="flex justify-end p-2">
                <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-500 hover:text-primary transition-colors"
                    onClick={toggleCollapse}
                >
                    {isCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
            </div>

            {!isCollapsed && (
                <div className="relative h-64 overflow-hidden flex items-center justify-center">
                    <img
                        ref={albumCoverRef}
                        src="hachimitsu.svg"
                        alt={getSongName(musicList[currentIndex])}
                        className="w-48 h-48 object-cover transition-transform duration-700 group-hover:scale-110"
                        style={{
                            transform: `rotate(${rotationRef.current}deg)`,
                            transition: 'transform 0.3s ease-out'
                        }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>

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
            )}

            <div className="p-5">
                <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-450 truncate">{getSongName(musicList[currentIndex])}</h3>
                </div>

                {!isCollapsed && (
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
                )}

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

                <audio ref={audioRef} src={musicList[currentIndex]} preload="metadata"></audio>
            </div>
        </div>
    );
};

export default MusicPlayer;