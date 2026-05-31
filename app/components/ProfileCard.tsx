"use client";

import React, { useRef, MouseEvent, useCallback } from "react";

interface ProfileCardProps {
  avatarUrl?: string;
  miniAvatarUrl?: string;
  innerGradient?: string;
  behindGlowEnabled?: boolean;
  behindGlowColor?: string;
  className?: string;
  enableTilt?: boolean;
  enableMobileTilt?: boolean; // Kept for prop compatibility
  name?: string;
  title?: string;
  handle?: string;
  status?: string;
  contactText?: string;
  showUserInfo?: boolean;
  onContactClick?: () => void;
  // Included to prevent TS errors from previous props in page.tsx
  iconUrl?: string;
  grainUrl?: string;
  behindGlowSize?: string;
  mobileTiltSensitivity?: number;
}

const ProfileCard: React.FC<ProfileCardProps> = ({
  avatarUrl = "https://github.com/prajwalgowdavee.png",
  miniAvatarUrl = "https://github.com/prajwalgowdavee.png",
  innerGradient = "linear-gradient(145deg, rgba(186, 91, 56, 0.25) 0%, rgba(255, 249, 238, 0.04) 100%)",
  behindGlowEnabled = true,
  behindGlowColor = "rgba(186, 91, 56, 0.65)",
  className = "",
  enableTilt = true,
  name = "Prajwal Gowda D S",
  title = "AI Engineer",
  handle = "prajwalgowdavee",
  status = "Online",
  contactText = "Contact Me",
  showUserInfo = true,
  onContactClick,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (!enableTilt || !cardRef.current) return;

      const card = cardRef.current;
      const rect = card.getBoundingClientRect();
      
      // Calculate mouse position relative to the card
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Calculate center point
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      // Calculate rotation (max 10 degrees)
      const rotateX = ((y - centerY) / centerY) * -10;
      const rotateY = ((x - centerX) / centerX) * 10;

      card.style.setProperty("--x", `${x}px`);
      card.style.setProperty("--y", `${y}px`);
      card.style.setProperty("--rx", `${rotateX}deg`);
      card.style.setProperty("--ry", `${rotateY}deg`);
    },
    [enableTilt]
  );

  const handleMouseLeave = useCallback(() => {
    if (!enableTilt || !cardRef.current) return;
    
    const card = cardRef.current;
    // Reset to idle state
    card.style.setProperty("--rx", "0deg");
    card.style.setProperty("--ry", "0deg");
    // Move glare off-screen
    card.style.setProperty("--x", "50%");
    card.style.setProperty("--y", "-100%");
  }, [enableTilt]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <div className={`pc-wrapper ${className}`.trim()}>
        {behindGlowEnabled && (
          <div
            className="pc-glow"
            style={{ backgroundColor: behindGlowColor }}
          />
        )}

        <div
          ref={cardRef}
          className="pc-card"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{ background: innerGradient }}
        >
          {/* Mouse tracking glare */}
          <div className="pc-glare" />

          {/* Top text details */}
          <div className="pc-details">
            <h3>{name}</h3>
            <p>{title}</p>
          </div>

          {/* Main avatar */}
          <div className="pc-avatar-container">
            <img src={avatarUrl} alt={name} className="pc-avatar" />
            <div className="pc-avatar-fade" />
          </div>

          {/* User info box at bottom */}
          {showUserInfo && (
            <div className="pc-user-info">
              <div className="pc-user-details">
                <img src={miniAvatarUrl} alt={name} className="pc-mini-avatar" />
                <div className="pc-user-text">
                  <span className="pc-handle">@{handle}</span>
                  <span className="pc-status">{status}</span>
                </div>
              </div>
              <button onClick={onContactClick} className="pc-contact-btn">
                {contactText}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

const STYLES = `
  .pc-wrapper {
    position: relative;
    width: 100%;
    max-width: 380px;
    aspect-ratio: 0.718;
    perspective: 1000px;
    margin: 0 auto;
  }

  .pc-glow {
    position: absolute;
    inset: 10%;
    filter: blur(45px);
    opacity: 0.4;
    z-index: 0;
    pointer-events: none;
    transition: opacity 0.3s ease;
  }

  .pc-wrapper:hover .pc-glow {
    opacity: 0.7;
  }

  .pc-card {
    position: absolute;
    inset: 0;
    z-index: 1;
    border-radius: 30px;
    border: 1px solid rgba(255, 249, 238, 0.1);
    background-color: #0b0f1a;
    overflow: hidden;
    transform: rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg));
    transition: transform 0.15s cubic-bezier(0.25, 1, 0.5, 1);
    transform-style: preserve-3d;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
  }

  /* Make transition snappy during hover, smooth on leave */
  .pc-card:hover {
    transition: transform 0.05s linear;
  }

  /* The Glare Effect */
  .pc-glare {
    position: absolute;
    inset: 0;
    z-index: 10;
    pointer-events: none;
    background: radial-gradient(
      circle at var(--x, 50%) var(--y, -100%),
      rgba(255, 255, 255, 0.12) 0%,
      rgba(255, 255, 255, 0.02) 40%,
      transparent 60%
    );
  }

  .pc-details {
    position: absolute;
    top: 3rem;
    width: 100%;
    text-align: center;
    z-index: 5;
    pointer-events: none;
  }

  .pc-details h3 {
    margin: 0;
    font-size: clamp(1.8rem, 5vw, 2.4rem);
    font-weight: 700;
    color: #ffffff;
    text-shadow: 0 4px 12px rgba(0, 0, 0, 0.7);
  }

  .pc-details p {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 600;
    color: #e0e7ff;
    text-shadow: 0 2px 6px rgba(0, 0, 0, 0.6);
    transform: translateY(-4px);
  }

  .pc-avatar-container {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 75%;
    display: flex;
    justify-content: center;
    align-items: flex-end;
    pointer-events: none;
  }

  .pc-avatar {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: top;
    opacity: 0.9;
  }

  .pc-avatar-fade {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      to top,
      rgba(11, 15, 26, 1) 5%,
      rgba(11, 15, 26, 0.2) 40%,
      transparent 80%
    );
  }

  .pc-user-info {
    position: absolute;
    bottom: 20px;
    left: 20px;
    right: 20px;
    z-index: 15;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: rgba(13, 17, 28, 0.65);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 249, 238, 0.08);
    border-radius: 18px;
    padding: 12px 14px;
  }

  .pc-user-details {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .pc-mini-avatar {
    width: 42px;
    height: 42px;
    border-radius: 50%;
    object-fit: cover;
    border: 1px solid rgba(255, 249, 238, 0.1);
  }

  .pc-user-text {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .pc-handle {
    font-size: 0.85rem;
    font-weight: 600;
    color: #f8fafc;
    line-height: 1;
  }

  .pc-status {
    font-size: 0.75rem;
    font-weight: 500;
    color: rgba(255, 249, 238, 0.6);
    line-height: 1;
  }

  .pc-contact-btn {
    background: rgba(186, 91, 56, 0.15);
    border: 1px solid rgba(186, 91, 56, 0.3);
    border-radius: 8px;
    padding: 10px 14px;
    font-size: 0.75rem;
    font-weight: 700;
    color: #fff9ee;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .pc-contact-btn:hover {
    background: rgba(186, 91, 56, 0.35);
    transform: translateY(-1px);
  }

  @media (max-width: 480px) {
    .pc-user-info {
      bottom: 12px;
      left: 12px;
      right: 12px;
      padding: 8px 10px;
    }
    .pc-mini-avatar {
      width: 32px;
      height: 32px;
    }
    .pc-contact-btn {
      padding: 8px 12px;
    }
  }
`;

export default React.memo(ProfileCard);