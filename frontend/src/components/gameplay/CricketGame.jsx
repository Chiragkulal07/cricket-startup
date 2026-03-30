import React, { useRef, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';

/**
 * CricketGame Component
 * Renders a full-screen HTML5 canvas with a game loop.
 */
const outSound = new Audio("/out.mp3");

const CricketGame = () => {
    const location = useLocation();
    const [playerName, setPlayerName] = useState(location.state?.playerName || 'Player');
    const [roomId, setRoomId] = useState(location.state?.roomId || '');
    const [mode, setMode] = useState(location.state?.roomId ? 'multiplayer' : 'ai');
    const [currentBatter, setCurrentBatter] = useState(location.state?.batter || '');
    const [currentBowler, setCurrentBowler] = useState(location.state?.bowler || '');

    const isBatter = mode === 'multiplayer' ? (playerName === currentBatter) : true;
    const isBowler = mode === 'multiplayer' ? (playerName === currentBowler) : true;

    useEffect(() => {
        if (mode === 'multiplayer') {
            console.log("Multiplayer Match Info:", { 
                playerName, 
                currentBatter, 
                currentBowler, 
                role: isBatter ? 'batter' : (isBowler ? 'bowler' : 'spectator') 
            });
        }
    }, [mode, playerName, currentBatter, currentBowler, isBatter, isBowler]);

    const canvasRef = useRef(null);
    const [shotDirection, setShotDirection] = useState('STRAIGHT');
    const [isLoaded, setIsLoaded] = useState(false);
    const [showPopup, setShowPopup] = useState(false);
    const [popupText, setPopupText] = useState('');
    const [isBallActive, setIsBallActive] = useState(false);
    const isBallActiveRef = useRef(false);
    const socketRef = useRef(null);
    
    // Image Refs
    const images = useRef({
        batsman: new Image(),
        bowler: new Image(),
        stadium: new Image(),
        ball: new Image()
    });

    const ballState = useRef({
        x: 0,
        y: 0,
        velocityX: 0,
        velocityY: 5,
        isHit: false,
        hasBounced: false,
        isActive: false
    });

    const swingState = useRef({
        isSwinging: false,
        swingProgress: 0
    });

    const isOut = useRef(false);
    const score = useRef(0);
    const wickets = useRef(0);
    const lastResult = useRef("");
    const zoom = useRef(1);
    const playerTriedToHit = useRef(false);
    const showCanvasPopup = useRef(false);
    const canvasPopupText = useRef("");
    const hasEvaluated = useRef(false);
    const renderRef = useRef(null);
    const batsmanX = useRef(0);
    const [uiBatsmanX, setUiBatsmanX] = useState(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let animationFrameId;

        // Set source for images
        images.current.batsman.src = "/batsman.png";
        images.current.bowler.src = "/bowler.png";
        images.current.stadium.src = "/stadium.png";
        images.current.ball.src = "/ball.png";

        // Pre-load images
        const imagePromises = Object.values(images.current).map(img => {
            return new Promise((resolve) => {
                img.onload = resolve;
                img.onerror = resolve; // Continue even if one fails
            });
        });

        Promise.all(imagePromises).then(() => {
            setIsLoaded(true);
            render();
        });

        // Animation frames
        let bowlFrame = 0;

        // Initialize ball position
        ballState.current.x = canvas.width / 2;
        ballState.current.y = (canvas.height - 400) / 2; // Top of pitch

        // Set canvas dimensions to window size
        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        // Initial resize
        resizeCanvas();
        
        if (batsmanX.current === 0 && canvas) {
            batsmanX.current = canvas.width / 2;
            setUiBatsmanX(batsmanX.current);
        }

        // Handle window resizing
        window.addEventListener('resize', resizeCanvas);

        // Game Loop
        const render = () => {
            renderRef.current = render;
            const ball = ballState.current;
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            const batsmanY = canvas.height * 0.80;
            const wicketX = canvas.width / 2;

            // Clear canvas every frame
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // 0. Variable Declarations
            const bowlFrameRate = 0.1;
            if (isBallActiveRef.current) bowlFrame += bowlFrameRate;
            const bowlerOffsetY = Math.sin(bowlFrame) * 5;
            const bowlerWidth = 60;
            const bowlerHeight = 110;
            const batsmanWidth = 70;
            const batsmanHeight = 130;
            const bowlerOffset = 390; 
            const paddingOffset = 20; 
            const bowlerY = batsmanY - bowlerOffset + paddingOffset + bowlerOffsetY;

            // Apply zoom effect (center-anchored)
            ctx.save();
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.scale(zoom.current, zoom.current);
            ctx.translate(-canvas.width / 2, -canvas.height / 2);
            
            // 1. Draw Stadium (Background)
            if (images.current.stadium.complete) {
                ctx.drawImage(images.current.stadium, 0, 0, canvas.width, canvas.height);
            } else {
                ctx.fillStyle = '#2e7d32'; 
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            const bounceY = batsmanY - 80;

            // 2. Draw Bowler (Aligned horizontally with ball line)
            if (images.current.bowler.complete) {
                ctx.drawImage(
                    images.current.bowler, 
                    ball.x - (bowlerWidth / 2), 
                    bowlerY, 
                    bowlerWidth, 
                    bowlerHeight
                );
            }

            // 3. Draw Pitch Elements (Visual hint)
            if (!isBallActiveRef.current && !isOut.current) {
                // Ball Line (Start of delivery)
                ctx.fillStyle = "yellow";
                ctx.beginPath();
                ctx.arc(ball.x, 50, 6, 0, Math.PI * 2);
                ctx.fill();

                // Pitch Map (Landing spot)
                ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
                ctx.beginPath();
                ctx.ellipse(ball.x, bounceY, 15, 8, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
                ctx.lineWidth = 2;
                ctx.stroke();
            }

            // 3b. Draw Top Wicket (Bowler End - Fixed on Pitch)
            const topWicketY = canvas.height * 0.50;
            const topWicketX = canvas.width / 2 - 10;
            const stumpWidthTop = 4;
            const stumpHeightTop = 25;
            const gapTop = 6;

            ctx.fillStyle = "#c19a6b";
            ctx.fillRect(topWicketX, topWicketY, stumpWidthTop, stumpHeightTop);
            ctx.fillRect(topWicketX + gapTop, topWicketY, stumpWidthTop, stumpHeightTop);
            ctx.fillRect(topWicketX + gapTop * 2, topWicketY, stumpWidthTop, stumpHeightTop);

            // --- Physics & Game State (Only when active) ---
            if (isBallActiveRef.current && !isOut.current) {

                // Ball Physics Calculation (Done before drawing any moving parts)
                const ball = ballState.current;

            if (!isOut.current) {
                ball.y += ball.velocityY;
                ball.x += ball.velocityX;

                if (!ball.isHit) {
                    ball.velocityY += 0.1;
                    const bounceY = batsmanY - 80;
                    if (!ball.hasBounced && ball.y >= bounceY && ball.velocityY > 0) {
                        ball.velocityY = -Math.abs(ball.velocityY) * 0.5;
                        ball.hasBounced = true;
                    }
                } else {
                    ball.velocityY += 0.1;
                }

                // Boundary-based Reset
                if (ball.y > canvas.height || ball.y < 0) {
                    ball.y = 0;
                    ball.x = canvas.width / 2 + (Math.random() * 100 - 50);
                    ball.velocityY = 3;
                    ball.velocityX = 0;
                    isOut.current = false;
                    hasEvaluated.current = false;
                    lastResult.current = "";
                    isBallActiveRef.current = false;
                    setIsBallActive(false);
                }
            }

            // Wicket Collision Detection (Bowled Out)
            if (
                !ball.isHit &&
                !isOut.current &&
                ball.y > batsmanY + 10 &&
                ball.y < batsmanY + 40 &&
                ball.x > wicketX - 20 &&
                ball.x < wicketX + 20
            ) {
                isOut.current = true;
                lastResult.current = "OUT";
                canvasPopupText.current = "OUT!";
                showCanvasPopup.current = true;
                setTimeout(() => { showCanvasPopup.current = false; }, 800);
                setPopupText("OUT!");
                setShowPopup(true);
                outSound.currentTime = 0;
                outSound.play().catch(() => {});
                console.log("BOWLED OUT");
                setTimeout(() => {
                    ball.y = 0;
                    ball.x = canvas.width / 2 + (Math.random() * 100 - 50);
                    ball.velocityY = 3;
                    ball.velocityX = 0;
                    ball.isHit = false;
                    isOut.current = false;
                    hasEvaluated.current = false;
                    lastResult.current = "";
                    isBallActiveRef.current = false;
                    setIsBallActive(false);
                    setShowPopup(false);
                }, 2000);
            }

            // Evaluate shot ONLY once per delivery when ball arrives at batsman
            if (!ball.isHit && !isOut.current && ball.y >= batsmanY && !hasEvaluated.current) {
                hasEvaluated.current = true;
                if (playerTriedToHit.current) {
                    const diffX = Math.abs(ball.x - batsmanX.current);
                    const diffY = Math.abs(ball.y - batsmanY);

                    if (diffX < 30 && diffY < 40) {
                        const timingDiff = Math.abs(ball.y - batsmanY);
                        const timingStr = timingDiff < 10 ? "perfect" : (timingDiff < 25 ? "good" : "late");
                        
                        if (mode === 'multiplayer') {
                            if (isBatter) {
                                console.log("Emitting hitBall:", { roomId, timing: timingStr });
                                socketRef.current.emit('hitBall', { roomId, timing: timingStr });
                            }
                        } else {
                            // Local AI Mode evaluation (Existing logic refactored)
                            const localResult = timingStr === "perfect" ? 6 : (timingStr === "good" ? 4 : 0);
                            handleBallResult(localResult, timingStr);
                        }
                    } else {
                        console.log("MISS");
                        if (mode !== 'multiplayer') {
                            lastResult.current = "MISS";
                            resetBall();
                        }
                    }
                } else if (mode !== 'multiplayer') {
                    // AI Mode non-swing logic
                    const wicketCenter = wicketX;
                    const isStraight = Math.abs(ball.x - wicketCenter) < 15;
                    if (isStraight) {
                        handleBallResult("OUT", "late");
                    } else {
                        lastResult.current = "MISS";
                        resetBall();
                    }
                }
                playerTriedToHit.current = false;
            }

            let ballSize = ball.y < canvas.height * 0.5 ? 6 : 10;
            if (images.current.ball.complete) {
                ctx.drawImage(
                    images.current.ball, 
                    ball.x - ballSize / 2, 
                    ball.y - ballSize / 2, 
                    ballSize, 
                    ballSize
                );
            } else {
                ctx.beginPath();
                ctx.arc(ball.x, ball.y, ballSize / 2, 0, Math.PI * 2);
                ctx.fillStyle = '#ff0000';
                ctx.fill();
                ctx.closePath();
            }
            } // End of Active Physics Block

            // 4b. Draw Near Wicket (Behind Batsman - 3 Stumps) - Moved here to reflect isOut state in the last frame
            const stumpWidthNear = 4;
            const stumpHeightNear = 30;
            const gapNear = 6;
            const baseXNear = wicketX - 10;
            const baseYNear = batsmanY + 20;

            ctx.fillStyle = "#c19a6b";
            if (!isOut.current) {
                // Normal upright stumps
                ctx.fillRect(baseXNear, baseYNear, stumpWidthNear, stumpHeightNear);
                ctx.fillRect(baseXNear + gapNear, baseYNear, stumpWidthNear, stumpHeightNear);
                ctx.fillRect(baseXNear + gapNear * 2, baseYNear, stumpWidthNear, stumpHeightNear);
            } else {
                // Broken / scattered stumps effect
                ctx.fillRect(baseXNear - 5, baseYNear + 10, 4, 20);
                ctx.fillRect(baseXNear + 8, baseYNear + 15, 4, 20);
                ctx.fillRect(baseXNear + 20, baseYNear + 5, 4, 20);
            }

            // 6. Draw Batsman (LAST - on top of everything)
            const swing = swingState.current;
            let batsmanOffsetX = 0;
            let batsmanOffsetY = 0;
            
            if (swing.isSwinging) {
                swing.swingProgress += 0.2; // Speed of swing
                batsmanOffsetX = Math.sin(swing.swingProgress) * 20; // Side shift
                batsmanOffsetY = -Math.abs(Math.sin(swing.swingProgress)) * 5; // Slight jump
                
                if (swing.swingProgress >= Math.PI) {
                    swing.isSwinging = false;
                    swing.swingProgress = 0;
                }
            }

            if (images.current.batsman.complete) {
                // Grounding adjustment: move image up so feet touch ground line
                // Maintaining a 20px padding compensation for the sprite
                const bDrawWidth = batsmanWidth;
                const bDrawHeight = batsmanHeight;
                const bDrawX = batsmanX.current - (bDrawWidth / 2) + batsmanOffsetX;
                const bDrawY = batsmanY - (bDrawHeight - 20) + batsmanOffsetY;

                ctx.drawImage(
                    images.current.batsman, 
                    bDrawX, 
                    bDrawY, 
                    bDrawWidth, 
                    bDrawHeight
                );
            }

            // 7. Cleanup legacy out overlay (replaced by Result Popup)

            // 8. Draw Score HUD (top-left)
            ctx.restore(); 

            // Result Popup (Canvas-based)
            if (showCanvasPopup.current) {
                ctx.fillStyle = "yellow";
                ctx.font = "bold 40px Arial";
                ctx.fillText(canvasPopupText.current, canvas.width / 2 - 80, canvas.height / 2);
            }

            ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
            ctx.fillRect(10, 10, 200, 60);
            ctx.fillStyle = "white";
            ctx.font = "bold 20px Arial";
            ctx.textAlign = "left";
            ctx.fillText(`Score: ${score.current}`, 22, 35);
            ctx.fillText(`Wickets: ${wickets.current}`, 22, 55);
            ctx.font = "16px Arial";
            const resultColor = lastResult.current === "OUT" ? "#ff4444" : lastResult.current === "SIX!" ? "#FFD700" : lastResult.current === "FOUR!" ? "#00e676" : "#aaaaaa";
            ctx.fillStyle = resultColor;
            ctx.fillText(lastResult.current, 22, 75);

            // Request next frame
            animationFrameId = requestAnimationFrame(render);
        };

        // Start the loop
        render();

        // Cleanup function
        return () => {
            window.removeEventListener('resize', resizeCanvas);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    // Socket Connection & Ball Listener
    useEffect(() => {
        if (mode === 'multiplayer' && roomId) {
            socketRef.current = io('http://localhost:3000');
            
            socketRef.current.on('connect', () => {
                console.log("Game Socket connected:", socketRef.current.id);
                socketRef.current.emit('joinRoom', { roomId, playerName });
            });

            socketRef.current.on('ballBowled', (data) => {
                console.log("Received ballBowled:", data);
                setShotDirection(data.direction);
                startBallAnimation(data.direction);
            });

            socketRef.current.on('ballResult', (data) => {
                console.log("Received ballResult:", data);
                handleBallResult(data.result, data.timing);
            });

            return () => {
                if (socketRef.current) socketRef.current.disconnect();
            };
        }
    }, [mode, roomId, playerName]);

    const handleBallResult = (result, timing) => {
        const ball = ballState.current;
        const canvas = canvasRef.current;
        if (!ball || !canvas) return;

        if (result === "wicket" || result === "OUT") {
            isOut.current = true;
            lastResult.current = "OUT";
            canvasPopupText.current = "OUT!";
            showCanvasPopup.current = true;
            setTimeout(() => { showCanvasPopup.current = false; }, 800);
            setPopupText("OUT!");
            setShowPopup(true);
            outSound.currentTime = 0;
            outSound.play().catch(() => {});
            
            setTimeout(() => {
                resetBall();
                setShowPopup(false);
            }, 2000);
        } else if (result === 6 || result === 4) {
            ball.isHit = true;
            ball.velocityY = result === 6 ? -15 : -8;
            score.current += result;
            lastResult.current = result === 6 ? "SIX!" : "FOUR!";
            canvasPopupText.current = lastResult.current;
            showCanvasPopup.current = true;
            setTimeout(() => { showCanvasPopup.current = false; }, 800);
            setPopupText(result === 6 ? "SIX!! 🏏" : "FOUR! 🏏");
            setShowPopup(true);
            
            if (result === 6) zoom.current = 1.2;
            
            setTimeout(() => { 
                zoom.current = 1; 
                setShowPopup(false);
            }, 1500);

            // Directional velocity
            if (shotDirection === 'LEFT') ball.velocityX = result === 6 ? -5 : -2.5;
            else if (shotDirection === 'RIGHT') ball.velocityX = result === 6 ? 5 : 2.5;
            else ball.velocityX = 0;

        } else {
            // Dot or Small Run (0, 1, 2)
            if (result > 0) {
                ball.isHit = true;
                ball.velocityY = -5;
                score.current += result;
                lastResult.current = `${result} RUN${result > 1 ? 'S' : ''}`;
                canvasPopupText.current = lastResult.current;
                showCanvasPopup.current = true;
                setTimeout(() => { showCanvasPopup.current = false; }, 800);
                setPopupText(`${result} RUN!`);
                setShowPopup(true);
                setTimeout(() => setShowPopup(false), 1000);
            } else {
                lastResult.current = "DOT";
                setTimeout(() => resetBall(), 500);
            }
        }
    };

    const resetBall = () => {
        const ball = ballState.current;
        const canvas = canvasRef.current;
        if (!canvas) return;

        ball.y = 0;
        ball.x = canvas.width / 2 + (Math.random() * 100 - 50);
        ball.velocityY = 3;
        ball.velocityX = 0;
        ball.isHit = false;
        ball.hasBounced = false;
        isOut.current = false;
        hasEvaluated.current = false;
        isBallActiveRef.current = false;
        setIsBallActive(false);
    };

    const handleHit = () => {
        if (!isBallActiveRef.current) return;
        // Only register player's intent — timing is evaluated in the render loop
        playerTriedToHit.current = true;
        swingState.current.isSwinging = true;
        swingState.current.swingProgress = 0;
    };

    const moveBatsman = (dir) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const step = 20;
        let newX = dir === 'LEFT' ? batsmanX.current - step : batsmanX.current + step;
        // Clamp between 50 and canvas.width - 50
        newX = Math.max(50, Math.min(canvas.width - 50, newX));
        batsmanX.current = newX;
        setUiBatsmanX(newX); // Trigger re-render to reflect position if needed
    };

    const startBall = () => {
        if (mode === 'multiplayer') {
            if (isBowler) {
                console.log("Emitting bowlBall:", { roomId, direction: shotDirection });
                socketRef.current.emit('bowlBall', { roomId, direction: shotDirection });
            }
        } else {
            startBallAnimation(shotDirection);
        }
    };

    const startBallAnimation = (dir) => {
        setIsBallActive(true); // Hide READY button immediately
        
        setTimeout(() => {
            isBallActiveRef.current = true;
            // Reset ball to bowler's end
            const ball = ballState.current;
            const canvas = canvasRef.current;
            if (!canvas) return;

            ball.y = 0;
            
            // Synchronize starting X based on direction
            const center = canvas.width / 2;
            if (dir === 'LEFT') ball.x = center - 40;
            else if (dir === 'RIGHT') ball.x = center + 40;
            else ball.x = center;

            ball.velocityY = 3;
            ball.velocityX = 0;
            ball.isHit = false;
            ball.hasBounced = false;
            hasEvaluated.current = false;
            lastResult.current = "READY";
            
            // Restart the loop
            if (renderRef.current) renderRef.current();
        }, 800);
    };

    return (
        <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            width: '100vw', 
            height: '100vh', 
            overflowY: 'auto', 
            backgroundColor: '#111', 
            fontFamily: "'Inter', sans-serif",
            position: 'relative'
        }}>
            {/* Multiplayer Header */}
            {mode === 'multiplayer' && (
                <div style={{
                    position: 'absolute',
                    top: '20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 10,
                    background: 'rgba(0, 0, 0, 0.6)',
                    backdropFilter: 'blur(15px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    padding: '12px 30px',
                    borderRadius: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '10px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                    color: 'white',
                    minWidth: '400px'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                             <span style={{ 
                                background: '#FFD700', 
                                color: 'black', 
                                padding: '2px 8px', 
                                borderRadius: '4px', 
                                fontSize: '0.65rem',
                                fontWeight: '900',
                             }}>LIVE</span>
                             <span style={{ opacity: 0.7, fontSize: '0.9rem' }}>Room: {roomId}</span>
                        </div>
                        
                        <div style={{
                            background: isBatter ? '#4CAF50' : (isBowler ? '#2196F3' : '#888'),
                            color: 'white',
                            padding: '4px 12px',
                            borderRadius: '30px',
                            fontSize: '0.8rem',
                            fontWeight: '700',
                            textTransform: 'uppercase'
                        }}>
                            {isBatter ? "You are Batting" : (isBowler ? "You are Bowling" : "Spectating")}
                        </div>
                    </div>

                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'center', 
                        gap: '30px', 
                        width: '100%', 
                        fontSize: '0.95rem',
                        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                        paddingTop: '8px'
                    }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.7rem', opacity: 0.5, textTransform: 'uppercase' }}>Batter</span>
                            <span style={{ fontWeight: '700', color: isBatter ? '#4CAF50' : 'white' }}>{currentBatter || 'Waiting...'}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.7rem', opacity: 0.5, textTransform: 'uppercase' }}>Bowler</span>
                            <span style={{ fontWeight: '700', color: isBowler ? '#2196F3' : 'white' }}>{currentBowler || 'Waiting...'}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Game Viewport */}
            <canvas
                ref={canvasRef}
                style={{
                    display: 'block',
                    width: '100%',
                    height: '75vh', // Keep most of the screen for game
                    backgroundColor: '#2e7d32'
                }}
            />
            
            {/* UI Controls - Positioned below canvas */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '20px',
                padding: '20px',
                marginTop: '10px',
                backgroundColor: '#222',
                borderTop: '4px solid #444',
                flex: 1
            }}>
                {/* Bowling Direction Selection */}
                {isBowler && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '0.8rem', color: '#aaa', textTransform: 'uppercase' }}>Select Bowling Line</span>
                        <div style={{ display: 'flex', gap: '15px' }}>
                            {['LEFT', 'STRAIGHT', 'RIGHT'].map((dir) => (
                                <button
                                    key={dir}
                                    onClick={() => setShotDirection(dir)}
                                    style={{
                                        padding: '10px 20px',
                                        fontSize: '16px',
                                        fontWeight: 'bold',
                                        backgroundColor: shotDirection === dir ? '#2196F3' : '#333',
                                        color: 'white',
                                        border: '2px solid' + (shotDirection === dir ? '#FFF' : '#666'),
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {dir}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                
                {/* Batting Controls */}
                {isBatter && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                        {/* Hit Action Button (Dedicated) */}
                        <button
                            onClick={handleHit}
                            style={{
                                padding: '15px 80px',
                                fontSize: '24px',
                                fontWeight: 'bold',
                                backgroundColor: '#ff5722',
                                color: 'white',
                                border: 'none',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                boxShadow: '0 8px 16px rgba(255, 87, 34, 0.3)',
                                textTransform: 'uppercase',
                                transition: 'all 0.2s'
                            }}
                            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
                            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        >
                            HIT
                        </button>

                        {/* Movement Controls */}
                        <div style={{ display: 'flex', gap: '15px' }}>
                            <button
                                onClick={() => moveBatsman('LEFT')}
                                style={{
                                    padding: '12px 25px',
                                    backgroundColor: '#444',
                                    color: 'white',
                                    border: '1px solid #666',
                                    borderRadius: '10px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold'
                                }}
                            >
                                ⬅️ LEFT
                            </button>
                            <button
                                onClick={() => moveBatsman('RIGHT')}
                                style={{
                                    padding: '12px 25px',
                                    backgroundColor: '#444',
                                    color: 'white',
                                    border: '1px solid #666',
                                    borderRadius: '10px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold'
                                }}
                            >
                                RIGHT ➡️
                            </button>
                        </div>
                    </div>
                )}
 pocket
                {/* Non-role placeholder */}
                {!isBatter && !isBowler && (
                    <div style={{ color: '#888', fontStyle: 'italic', padding: '20px' }}>
                        Waiting for your turn...
                    </div>
                )}

                {/* READY Trigger (Only pre-delivery, only for bowler) */}
                {isBowler && !isBallActive && (
                    <button
                        onClick={startBall}
                        style={{
                            padding: '20px 80px',
                            fontSize: '28px',
                            fontWeight: 'bold',
                            backgroundColor: '#4CAF50',
                            color: 'white',
                            border: 'none',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            boxShadow: '0 8px 20px rgba(76, 175, 80, 0.4)',
                            transition: 'all 0.2s',
                            textTransform: 'uppercase',
                            marginTop: '10px'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        BOWL NOW
                    </button>
                )}
            </div>

            {/* Game Overlay HUD */}
            {showPopup && (
                <div style={{
                    position: 'absolute',
                    top: '40%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: 'rgba(0, 0, 0, 0.9)',
                    padding: '40px 80px',
                    borderRadius: '20px',
                    border: '4px solid' + (popupText.includes('OUT') ? '#ff4444' : '#FFD700'),
                    boxShadow: '0 0 50px rgba(0,0,0,0.8)',
                    zIndex: 1000,
                    animation: 'popup-bloom 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
                    pointerEvents: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                }}>
                    <h1 style={{
                        color: popupText.includes('OUT') ? '#ff4444' : '#FFD700',
                        fontSize: '5rem',
                        margin: 0,
                        textTransform: 'uppercase',
                        letterSpacing: '8px',
                        fontWeight: '900',
                        textShadow: '0 0 20px rgba(0,0,0,0.8)',
                        fontFamily: "'Inter', system-ui, sans-serif"
                    }}>
                        {popupText}
                    </h1>
                </div>
            )}

            <style>{`
                @keyframes popup-bloom {
                    0% { transform: translate(-50%, -50%) scale(0.3); opacity: 0; }
                    100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
    
};

export default CricketGame;
