/**
 * Pure per-frame scroll logic.
 *
 * Each function receives an immutable state snapshot and a time slice (dt in ms)
 * and returns the next state together with the container offset:
 *
 *   fn( state, dt ) -> { state: <next state>, offset: { x, y } }
 *
 * State snapshot:
 *   {
 *       xPos, yPos,                     // current scroll positions
 *       pingPongCurrentDirection,       // +1, -1 or 0 (paused)
 *       pingPongNextDirection,          // direction after the pause
 *       pingPongPauseDelay,             // remaining pause time in ms
 *       speed,                          // target speed in px/ms
 *       currentSpeed,                   // eased speed in px/ms
 *       easing,                         // easing enabled flag
 *       easingValue,                    // easing factor
 *       pingPongDelay,                  // pause duration at boundaries in ms
 *       dimensions : {
 *           visibleWidth, visibleHeight,
 *           totalScrollItemWidth, totalScrollItemHeight
 *       }
 *   }
 *
 * The functions never read instance fields and never touch the DOM;
 * the caller applies the returned state and offset.
 */

/**
 * Resolves the effective speed for this tick, easing the current
 * speed towards the target speed if easing is enabled.
 * @param state
 * @returns {{speed: number, currentSpeed: number}}
 */
function resolveSpeed( state )
{
    if ( true === state.easing && 1 > state.easingValue )
    {
        const currentSpeed = ( 1 - state.easingValue ) * state.currentSpeed + state.easingValue * state.speed;
        return { speed : currentSpeed, currentSpeed : currentSpeed };
    }
    return { speed : state.speed, currentSpeed : state.currentSpeed };
}

/**
 * Creates a mutable working copy of the given state snapshot.
 * @param state
 * @returns {object}
 */
function copyState( state )
{
    return Object.assign( {}, state );
}

const TickLogic = {

    fnNoScroll : function( state, dt )
    {
        // Nothing to do
        return {
            state : copyState( state ),
            offset : { x : 0, y : 0 }
        };
    },

    fnHorizontalLtrPingPong : function( state, dt )
    {
        const next = copyState( state ),
              resolved = resolveSpeed( state ),
              speed = resolved.speed;
        next.currentSpeed = resolved.currentSpeed;

        if ( +1 === next.pingPongCurrentDirection )
        {
            next.xPos += ( dt * speed );

            if ( ( next.xPos + next.dimensions.visibleWidth ) > next.dimensions.totalScrollItemWidth )
            {
                next.pingPongCurrentDirection = 0;
                next.pingPongNextDirection = -1;
            }
        }
        else if ( -1 === next.pingPongCurrentDirection )
        {
            next.xPos -= ( dt * speed );

            if ( next.xPos <= 0 )
            {
                next.pingPongCurrentDirection = 0;
                next.pingPongNextDirection = 1;
            }
        }
        else
        {
            next.pingPongPauseDelay -= dt;
            if ( next.pingPongPauseDelay < 0 )
            {
                next.pingPongCurrentDirection = next.pingPongNextDirection;
                next.pingPongPauseDelay = next.pingPongDelay;
            }
        }

        return {
            state : next,
            offset : { x : -next.xPos, y : 0 }
        };
    },

    fnHorizontalRtlPingPong : function( state, dt )
    {
        const next = copyState( state ),
              resolved = resolveSpeed( state ),
              speed = resolved.speed;
        next.currentSpeed = resolved.currentSpeed;

        if ( +1 === next.pingPongCurrentDirection )
        {
            next.xPos -= ( dt * speed );

            if ( next.xPos < 0 )
            {
                next.xPos = 0;
                next.pingPongCurrentDirection = 0;
                next.pingPongNextDirection = -1;
            }
        }
        else if ( -1 === next.pingPongCurrentDirection )
        {
            next.xPos += ( dt * speed );

            if ( next.xPos > ( next.dimensions.totalScrollItemWidth - next.dimensions.visibleWidth ) )
            {
                next.xPos = ( next.dimensions.totalScrollItemWidth - next.dimensions.visibleWidth );
                next.pingPongCurrentDirection = 0;
                next.pingPongNextDirection = 1;
            }
        }
        else
        {
            next.pingPongPauseDelay -= dt;
            if ( next.pingPongPauseDelay < 0 )
            {
                next.pingPongCurrentDirection = next.pingPongNextDirection;
                next.pingPongPauseDelay = next.pingPongDelay;
            }
        }

        return {
            state : next,
            offset : { x : -next.xPos, y : 0 }
        };
    },

    fnHorizontalTtbPingPong : function( state, dt )
    {
        const next = copyState( state ),
              resolved = resolveSpeed( state ),
              speed = resolved.speed;
        next.currentSpeed = resolved.currentSpeed;

        if ( +1 === next.pingPongCurrentDirection )
        {
            next.yPos -= ( dt * speed );
            if ( next.yPos < -(next.dimensions.totalScrollItemHeight - next.dimensions.visibleHeight) )
            {
                next.yPos = -(next.dimensions.totalScrollItemHeight - next.dimensions.visibleHeight);
                next.pingPongCurrentDirection = 0;
                next.pingPongNextDirection = -1;
            }
        }
        else if ( -1 === next.pingPongCurrentDirection )
        {
            next.yPos += ( dt * speed );
            if ( next.yPos > 0 )
            {
                next.yPos = 0;
                next.pingPongCurrentDirection = 0;
                next.pingPongNextDirection = 1;
            }
        }
        else
        {
            next.pingPongPauseDelay -= dt;
            if ( next.pingPongPauseDelay < 0 )
            {
                next.pingPongCurrentDirection = next.pingPongNextDirection;
                next.pingPongPauseDelay = next.pingPongDelay;
            }
        }

        return {
            state : next,
            offset : { x : 0, y : next.yPos }
        };
    },

    fnHorizontalBttPingPong : function( state, dt )
    {
        const next = copyState( state ),
              resolved = resolveSpeed( state ),
              speed = resolved.speed;
        next.currentSpeed = resolved.currentSpeed;

        if ( +1 === next.pingPongCurrentDirection )
        {
            next.yPos += ( dt * speed );
            if ( next.yPos > 0 )
            {
                next.yPos = 0;
                next.pingPongCurrentDirection = 0;
                next.pingPongNextDirection = -1;
            }
        }
        else if ( -1 === next.pingPongCurrentDirection )
        {
            next.yPos -= ( dt * speed );
            if ( next.yPos < -(next.dimensions.totalScrollItemHeight - next.dimensions.visibleHeight) )
            {
                next.yPos = -(next.dimensions.totalScrollItemHeight - next.dimensions.visibleHeight);
                next.pingPongCurrentDirection = 0;
                next.pingPongNextDirection = 1;
            }
        }
        else
        {
            next.pingPongPauseDelay -= dt;
            if ( next.pingPongPauseDelay < 0 )
            {
                next.pingPongCurrentDirection = next.pingPongNextDirection;
                next.pingPongPauseDelay = next.pingPongDelay;
            }
        }

        return {
            state : next,
            offset : { x : 0, y : next.yPos }
        };
    },

    /**
     * Horizontal scroll logic, left to right
     * @param state
     * @param dt
     */
    fnHorizontalLtr : function( state, dt )
    {
        const next = copyState( state ),
              resolved = resolveSpeed( state ),
              speed = resolved.speed;
        next.currentSpeed = resolved.currentSpeed;

        next.xPos += ( dt * speed );

        if ( next.xPos > next.dimensions.totalScrollItemWidth )
        {
            next.xPos = next.dimensions.totalScrollItemWidth - next.xPos;
        }

        return {
            state : next,
            offset : { x : -next.xPos, y : 0 }
        };
    },

    /**
     * Horizontal scroll logic, right to left
     * @param state
     * @param dt
     */
    fnHorizontalRtl : function( state, dt )
    {
        const next = copyState( state ),
              resolved = resolveSpeed( state ),
              speed = resolved.speed;
        next.currentSpeed = resolved.currentSpeed;

        next.xPos -= ( dt * speed );

        if ( next.xPos < next.dimensions.totalScrollItemWidth )
        {
            next.xPos = next.dimensions.totalScrollItemWidth + next.xPos;
        }

        return {
            state : next,
            offset : { x : -( next.xPos - next.dimensions.totalScrollItemWidth ), y : 0 }
        };
    },

    /**
     * Vertical scroll logic, bottom to top
     * @param state
     * @param dt
     */
    fnVerticalBtt : function( state, dt )
    {
        const next = copyState( state ),
              resolved = resolveSpeed( state ),
              speed = resolved.speed;
        next.currentSpeed = resolved.currentSpeed;

        next.yPos += ( dt * speed );

        if ( next.yPos > next.dimensions.totalScrollItemHeight )
        {
            next.yPos = next.dimensions.totalScrollItemHeight - next.yPos;
        }

        return {
            state : next,
            offset : { x : 0, y : -next.yPos }
        };
    },

    /**
     * Vertical scroll logic, top to bottom
     * @param state
     * @param dt
     */
    fnVerticalTtb : function( state, dt )
    {
        const next = copyState( state ),
              resolved = resolveSpeed( state ),
              speed = resolved.speed;
        next.currentSpeed = resolved.currentSpeed;

        next.yPos -= ( dt * speed );

        if ( next.yPos < next.dimensions.totalScrollItemHeight )
        {
            next.yPos = next.dimensions.totalScrollItemHeight + next.yPos;
        }

        return {
            state : next,
            offset : { x : 0, y : -( next.yPos - next.dimensions.totalScrollItemHeight ) }
        };
    }
};

export { TickLogic };
