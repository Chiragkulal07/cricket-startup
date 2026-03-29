import React, { useRef, useEffect, useState } from 'react';

/**
 * CricketGame Component
 * Renders a full-screen HTML5 canvas with a game loop.
 */
const outSound = new Audio("/out.mp3");

const CricketGame = () => {
    const canvasRef = useRef(null);
    const [shotDirection, setShotDirection] = useState('STRAIGHT');
    const [isLoaded, setIsLoaded] = useState(false);
    const [showPopup, setShowPopup] = useState(false);
    const [popupText, setPopupText] = useState('');
    const [isBallActive, setIsBallActive] = useState(false);
    const isBallActiveRef = useRef(false);
    
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
                        // Precise timing: how close was the ball to batsmanY when HIT was pressed?
                        const timingDiff = Math.abs(ball.y - batsmanY);

                        if (timingDiff < 10) {
                            console.log("SIX");
                            ball.isHit = true;
                            ball.velocityY = -15;
                            score.current += 6;
                            lastResult.current = "SIX!";
                            canvasPopupText.current = "SIX!";
                            showCanvasPopup.current = true;
                            setTimeout(() => { showCanvasPopup.current = false; }, 800);
                            setPopupText("SIX!! 🏏");
                            setShowPopup(true);
                            zoom.current = 1.2;
                            setTimeout(() => { 
                                zoom.current = 1; 
                                setShowPopup(false);
                            }, 1500);
                            console.log("Score:", score.current);
                            if (shotDirection === 'LEFT') ball.velocityX = -5;
                            else if (shotDirection === 'RIGHT') ball.velocityX = 5;
                            else ball.velocityX = 0;

                        } else if (timingDiff < 25) {
                            console.log("FOUR");
                            ball.isHit = true;
                            ball.velocityY = -8;
                            score.current += 4;
                            lastResult.current = "FOUR!";
                            canvasPopupText.current = "FOUR!";
                            showCanvasPopup.current = true;
                            setTimeout(() => { showCanvasPopup.current = false; }, 800);
                            setPopupText("FOUR! 🏏");
                            setShowPopup(true);
                            console.log("Score:", score.current);
                            setTimeout(() => setShowPopup(false), 1500);
                            if (shotDirection === 'LEFT') ball.velocityX = -2.5;
                            else if (shotDirection === 'RIGHT') ball.velocityX = 2.5;
                            else ball.velocityX = 0;

                        } else {
                            console.log("DOT");
                            lastResult.current = "DOT";
                            console.log("Score:", score.current);
                            ball.y = 0;
                            ball.x = canvas.width / 2 + (Math.random() * 100 - 50);
                            ball.velocityY = 3;
                            ball.velocityX = 0;
                            ball.hasBounced = false;
                            hasEvaluated.current = false;
                            isBallActiveRef.current = false;
                            setIsBallActive(false);
                        }
                    } else {
                        // Out of reach/accuracy check failed
                        console.log("OUT OF REACH - MISS");
                        lastResult.current = "MISS";
                        canvasPopupText.current = "MISS";
                        showCanvasPopup.current = true;
                        setTimeout(() => { showCanvasPopup.current = false; }, 800);
                        ball.y = 0;
                        ball.x = canvas.width / 2 + (Math.random() * 100 - 50);
                        ball.velocityY = 3;
                        ball.velocityX = 0;
                        ball.hasBounced = false;
                        hasEvaluated.current = false;
                        isBallActiveRef.current = false;
                        setIsBallActive(false);
                    }
                } else {
                    // Player didn't attempt — check if it hits the wicket
                    const wicketCenter = wicketX;
                    const lineDiff = Math.abs(ball.x - wicketCenter);
                    const isStraight = lineDiff < 15;

                    if (isStraight) {
                        console.log("BOWLED!");
                        lastResult.current = "OUT";
                        canvasPopupText.current = "BOWLED!";
                        showCanvasPopup.current = true;
                        setTimeout(() => { showCanvasPopup.current = false; }, 800);
                        wickets.current++;
                        isOut.current = true;
                        setShowPopup(true);
                        setPopupText("BOWLED!");
                        outSound.currentTime = 0;
                        outSound.play().catch(() => {});
                        
                        setTimeout(() => {
                            ball.y = 0;
                            ball.x = canvas.width / 2 + (Math.random() * 100 - 50);
                            ball.velocityY = 3;
                            ball.velocityX = 0;
                            ball.isHit = false;
                            ball.hasBounced = false;
                            isOut.current = false;
                            hasEvaluated.current = false;
                            lastResult.current = "";
                            isBallActiveRef.current = false;
                            setIsBallActive(false);
                            setShowPopup(false);
                        }, 2000);
                    } else {
                        console.log("MISS");
                        lastResult.current = "MISS";
                        canvasPopupText.current = "MISS";
                        showCanvasPopup.current = true;
                        setTimeout(() => { showCanvasPopup.current = false; }, 800);
                        ball.y = 0;
                        ball.x = canvas.width / 2 + (Math.random() * 100 - 50);
                        ball.velocityY = 3;
                        ball.velocityX = 0;
                        ball.hasBounced = false;
                        hasEvaluated.current = false;
                        isBallActiveRef.current = false;
                        setIsBallActive(false);
                    }
                }
                // Always consume the intent flag
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
        setIsBallActive(true); // Hide READY button immediately
        
        setTimeout(() => {
            isBallActiveRef.current = true;
            // Reset ball to bowler's end
            const ball = ballState.current;
            const canvas = canvasRef.current;
            const bowlerY = canvas.height * 0.20;
            ball.y = 0;
            ball.x = canvas.width / 2 + (Math.random() * 100 - 50);
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
            fontFamily: 'Arial, sans-serif' 
        }}>
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
                {/* Direction Selection */}
                <div style={{ display: 'flex', gap: '15px' }}>
                    {['LEFT', 'STRAIGHT', 'RIGHT'].map((dir) => (
                        <button
                            key={dir}
                            onClick={() => setShotDirection(dir)}
                            style={{
                                padding: '12px 24px',
                                fontSize: '18px',
                                fontWeight: 'bold',
                                backgroundColor: shotDirection === dir ? '#4CAF50' : '#333',
                                color: 'white',
                                border: '2px solid' + (shotDirection === dir ? '#FFF' : '#666'),
                                borderRadius: '6px',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            {dir}
                        </button>
                    ))}
                </div>
                
                {/* Hit Action Button (Dedicated) */}
                <button
                    onClick={handleHit}
                    style={{
                        padding: '15px 60px',
                        fontSize: '22px',
                        fontWeight: 'bold',
                        backgroundColor: '#ff5722',
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        boxShadow: '0 4px 8px rgba(0,0,0,0.4)',
                        textTransform: 'uppercase'
                    }}
                >
                    HIT
                </button>

                {/* Movement Controls */}
                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                    <button
                        onClick={() => moveBatsman('LEFT')}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: '#555',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer'
                        }}
                    >
                        ⬅️ MOVE LEFT
                    </button>
                    <button
                        onClick={() => moveBatsman('RIGHT')}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: '#555',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer'
                        }}
                    >
                        MOVE RIGHT ➡️
                    </button>
                </div>

                {/* READY Trigger (Only pre-delivery) */}
                {!isBallActive && (
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
                            boxShadow: '0 6px 12px rgba(0,0,0,0.5)',
                            transition: 'transform 0.1s active',
                            textTransform: 'uppercase'
                        }}
                    >
                        READY
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
