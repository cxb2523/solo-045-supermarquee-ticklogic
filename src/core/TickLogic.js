/**
 * Pure per-frame scroll logic.
 *
 * Each function receives an immutable state snapshot and a time slice (dt in ms)
 * and returns the next state together with the transform to apply to the inner
 * container. The functions never read instance fields and never touch the DOM.
 *
 * State snapshot shape:
 * {
 *     xPos, yPos,                     // current scroll offsets
 *     speed,                          // resolved speed for this tick (easing already applied)
 *     pingPongCurrentDirection,       // +1 / -1 / 0 (0 = pausing at a boundary)
 *     pingPongNextDirection,          // direction to continue in after the pause
 *     pingPongPauseDelay,             // remaining pause time in ms
 *     pingPongDelay,                  // configured pause time in ms
 *     visibleWidth, visibleHeight,    // container dimensions
 *     totalScrollItemWidth, totalScrollItemHeight
 * }
 *
 * Return value: { state, transform }
 * `transform` is null when no style update is required.
 */
const TickLogic = {

    fnNoScroll : function( state, dt )
    {
        // Nothing to do
        return { state : Object.assign( {}, state ), transform : null };
    },

    fnHorizontalLtrPingPong : function( state, dt )
    {
        const next = Object.assign( {}, state );

        if ( +1 === state.pingPongCurrentDirection )
        {
            next.xPos = state.xPos + ( dt * state.speed );

            if ( ( next.xPos + state.visibleWidth ) > state.totalScrollItemWidth )
            {
                next.pingPongCurrentDirection = 0;
                next.pingPongNextDirection = -1;
            }
        }
        else if ( -1 === state.pingPongCurrentDirection )
        {
            next.xPos = state.xPos - ( dt * state.speed );

            if ( next.xPos <= 0 )
            {
                next.pingPongCurrentDirection = 0;
                next.pingPongNextDirection = 1;
            }
        }
        else
        {
            next.pingPongPauseDelay = state.pingPongPauseDelay - dt;
            if ( next.pingPongPauseDelay < 0 )
            {
                next.pingPongCurrentDirection = state.pingPongNextDirection;
                next.pingPongPauseDelay = state.pingPongDelay;
            }
        }

        return { state : next, transform : 'translate3d(-' + next.xPos + 'px,0,0)' };
    },

    fnHorizontalRtlPingPong : function( state, dt )
    {
        const next = Object.assign( {}, state );

        if ( +1 === state.pingPongCurrentDirection )
        {
            next.xPos = state.xPos - ( dt * state.speed );

            if ( next.xPos < 0 )
            {
                next.xPos = 0;
                next.pingPongCurrentDirection = 0;
                next.pingPongNextDirection = -1;
            }
        }
        else if ( -1 === state.pingPongCurrentDirection )
        {
            next.xPos = state.xPos + ( dt * state.speed );

            if ( next.xPos > ( state.totalScrollItemWidth - state.visibleWidth ) )
            {
                next.xPos = ( state.totalScrollItemWidth - state.visibleWidth );
                next.pingPongCurrentDirection = 0;
                next.pingPongNextDirection = 1;
            }
        }
        else
        {
            next.pingPongPauseDelay = state.pingPongPauseDelay - dt;
            if ( next.pingPongPauseDelay < 0 )
            {
                next.pingPongCurrentDirection = state.pingPongNextDirection;
                next.pingPongPauseDelay = state.pingPongDelay;
            }
        }

        return { state : next, transform : 'translate3d(-' + next.xPos + 'px,0,0)' };
    },

    fnHorizontalTtbPingPong : function( state, dt )
    {
        const next = Object.assign( {}, state );

        if ( +1 === state.pingPongCurrentDirection )
        {
            next.yPos = state.yPos - ( dt * state.speed );
            if ( next.yPos < -( state.totalScrollItemHeight - state.visibleHeight ) )
            {
                next.yPos = -( state.totalScrollItemHeight - state.visibleHeight );
                next.pingPongCurrentDirection = 0;
                next.pingPongNextDirection = -1;
            }
        }
        else if ( -1 === state.pingPongCurrentDirection )
        {
            next.yPos = state.yPos + ( dt * state.speed );
            if ( next.yPos > 0 )
            {
                next.yPos = 0;
                next.pingPongCurrentDirection = 0;
                next.pingPongNextDirection = 1;
            }
        }
        else
        {
            next.pingPongPauseDelay = state.pingPongPauseDelay - dt;
            if ( next.pingPongPauseDelay < 0 )
            {
                next.pingPongCurrentDirection = state.pingPongNextDirection;
                next.pingPongPauseDelay = state.pingPongDelay;
            }
        }

        return { state : next, transform : 'translate3d(0,' + next.yPos + 'px, 0)' };
    },

    fnHorizontalBttPingPong : function( state, dt )
    {
        const next = Object.assign( {}, state );

        if ( +1 === state.pingPongCurrentDirection )
        {
            next.yPos = state.yPos + ( dt * state.speed );
            if ( next.yPos > 0 )
            {
                next.yPos = 0;
                next.pingPongCurrentDirection = 0;
                next.pingPongNextDirection = -1;
            }
        }
        else if ( -1 === state.pingPongCurrentDirection )
        {
            next.yPos = state.yPos - ( dt * state.speed );
            if ( next.yPos < -( state.totalScrollItemHeight - state.visibleHeight ) )
            {
                next.yPos = -( state.totalScrollItemHeight - state.visibleHeight );
                next.pingPongCurrentDirection = 0;
                next.pingPongNextDirection = 1;
            }
        }
        else
        {
            next.pingPongPauseDelay = state.pingPongPauseDelay - dt;
            if ( next.pingPongPauseDelay < 0 )
            {
                next.pingPongCurrentDirection = state.pingPongNextDirection;
                next.pingPongPauseDelay = state.pingPongDelay;
            }
        }

        return { state : next, transform : 'translate3d(0,' + next.yPos + 'px, 0)' };
    },

    /**
     * Horizontal scroll logic, left to right
     */
    fnHorizontalLtr : function( state, dt )
    {
        const next = Object.assign( {}, state );

        next.xPos = state.xPos + ( dt * state.speed );

        if ( next.xPos > state.totalScrollItemWidth )
        {
            next.xPos = state.totalScrollItemWidth - next.xPos;
        }

        return { state : next, transform : 'translate3d(-' + next.xPos + 'px,0,0)' };
    },

    /**
     * Horizontal scroll logic, right to left
     */
    fnHorizontalRtl : function( state, dt )
    {
        const next = Object.assign( {}, state );

        next.xPos = state.xPos - ( dt * state.speed );

        if ( next.xPos < state.totalScrollItemWidth )
        {
            next.xPos = state.totalScrollItemWidth + next.xPos;
        }

        return { state : next, transform : 'translate3d(-' + ( next.xPos - state.totalScrollItemWidth ) + 'px,0,0)' };
    },

    /**
     * Vertical scroll logic, bottom to top
     */
    fnVerticalBtt : function( state, dt )
    {
        const next = Object.assign( {}, state );

        next.yPos = state.yPos + ( dt * state.speed );

        if ( next.yPos > state.totalScrollItemHeight )
        {
            next.yPos = state.totalScrollItemHeight - next.yPos;
        }

        return { state : next, transform : 'translate3d(0, -' + next.yPos + 'px,0)' };
    },

    /**
     * Vertical scroll logic, top to bottom
     */
    fnVerticalTtb : function( state, dt )
    {
        const next = Object.assign( {}, state );

        next.yPos = state.yPos - ( dt * state.speed );

        if ( next.yPos < state.totalScrollItemHeight )
        {
            next.yPos = state.totalScrollItemHeight + next.yPos;
        }

        return { state : next, transform : 'translate3d(0, -' + ( next.yPos - state.totalScrollItemHeight ) + 'px,0)' };
    }
};

export { TickLogic };
