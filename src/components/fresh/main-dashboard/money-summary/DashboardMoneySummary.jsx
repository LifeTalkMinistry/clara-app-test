REPLACE_STRING::orbTapTimerRef.current = setTimeout(() => {
        orbStateRef.current.lastTapAt = 0;
        handleMoneyLeftOrbClick?.(event);
      }, ORB_SINGLE_TAP_DELAY);::orbTapTimerRef.current = setTimeout(() => {
        orbStateRef.current.lastTapAt = 0;
        handleMoneyLeftOrbClick?.();
      }, ORB_SINGLE_TAP_DELAY);