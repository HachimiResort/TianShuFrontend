"use client"
import { useRef, useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Play, Pause, SkipBack, SkipForward } from "lucide-react";

// 假设的音乐列表
const musicList = [
    "/music/不再曼波.mp3",
    "/music/哈基米的夏天.mp3",
    "/music/哈雪大冒险.flac",
    "/music/梦中的哈基米.mp3"
];

// 从文件路径提取歌曲名称的辅助函数
const getSongName = (filePath:string) => {
    const fileName = filePath.split('/').pop();
    if (fileName) {
        return fileName.split('.')[0];
    }
    return "";
};

const MusicPlayer = () => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [rotateAnimation, setRotateAnimation] = useState('paused'); // 初始动画状态为暂停

    // 监听currentIndex变化，更新音频源并播放
    useEffect(() => {
        if (audioRef.current) {
            // 暂停当前播放
            audioRef.current.pause();
            // 设置新的音频源
            audioRef.current.src = musicList[currentIndex];

            // 加载新的音频
            audioRef.current.load();

            // 监听元数据加载完成事件，确保音频已准备好播放
            audioRef.current.onloadedmetadata = () => {
                if (isPlaying) {
                    audioRef.current!.play().catch(err => {
                        console.error("播放失败:", err);
                        setIsPlaying(false);
                    });
                }
            };
        }
    }, [currentIndex, isPlaying]);

    useEffect(() => {
        // 根据播放状态控制图片旋转动画的播放和暂停
        if (isPlaying) {
            setRotateAnimation('rotate');
        } else {
            setRotateAnimation('paused');
        }
    }, [isPlaying]);

    useEffect(() => {
        // 在这里调用insertRule来插入动画规则，不把返回值放在返回的JSX中
        document.styleSheets[0]?.insertRule(`
            @keyframes rotateAnimation {
                from {
                    transform: rotate(0deg);
                }
                to {
                    transform: rotate(360deg);
                }
            }
        `);
    }, []);


    const playMusic = () => {
        if (audioRef.current) {
            // 如果音频已暂停但有当前源，直接播放
            if (audioRef.current.paused && audioRef.current.src) {
                audioRef.current.play().catch(err => {
                    console.error("播放失败:", err);
                    setIsPlaying(false);
                });
            }
            setIsPlaying(true);
        }
    };

    const pauseMusic = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            setIsPlaying(false);
        }
    };

    const playNext = () => {
        // 更新索引，useEffect会处理音频切换
        setCurrentIndex((prevIndex) => (prevIndex + 1) % musicList.length);
        setIsPlaying(true);
    };

    const playPrevious = () => {
        // 更新索引，useEffect会处理音频切换
        setCurrentIndex((prevIndex) => (prevIndex - 1 + musicList.length) % musicList.length);
        setIsPlaying(true);
    };

    return (
        <div className="flex flex-col items-center space-y-4" style={{ maxWidth: '100%', width: '300px' }}>
            <div className="relative" style={{ width: '100px', height: '100px', margin: '0 auto' }}>
                {/* 显示图片，应用旋转动画样式 */}
                <img src="hachimitsu.svg" alt="音乐相关图片"
                     style={{
                         width: '100%',
                         height: '100%',
                         objectFit: 'cover',
                         animationPlayState: rotateAnimation === 'rotate'? 'running' : 'paused',
                         animationIterationCount: 'infinite',
                         animationTimingFunction: 'linear',
                         animationDuration: '5s',
                         animationName: rotateAnimation === 'rotate'? 'rotateAnimation' : 'none'
                     }}
                />
            </div>

            {/* 显示当前播放的歌曲名称 */}
            <div className="text-center font-medium text-gray">
                {getSongName(musicList[currentIndex])}
            </div>

            <div className="flex items-center space-x-4">
                <audio ref={audioRef} src={musicList[currentIndex]}></audio>
                <Button onClick={playPrevious}>
                    <SkipBack className="w-4 h-4 mr-2" />
                </Button>
                {isPlaying? (
                    <Button onClick={pauseMusic}>
                        <Pause className="w-4 h-4 mr-2" />
                    </Button>
                ) : (
                    <Button onClick={playMusic}>
                        <Play className="w-4 h-4 mr-2" />
                    </Button>
                )}
                <Button onClick={playNext}>
                    <SkipForward className="w-4 h-4 mr-2" />
                </Button>
            </div>
        </div>
    );
};

export default MusicPlayer;