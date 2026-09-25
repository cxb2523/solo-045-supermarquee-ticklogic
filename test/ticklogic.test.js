import { test } from 'node:test';
import assert from 'node:assert/strict';

import { TickLogic } from './../src/core/TickLogic.js';
import { Configuration } from './../src/core/Configuration.js';

function makeState( overrides = {} )
{
    return Object.assign( {
        xPos : 0,
        yPos : 0,
        speed : 1,
        pingPongCurrentDirection : 0,
        pingPongNextDirection : 1,
        pingPongPauseDelay : 2000,
        pingPongDelay : 2000,
        visibleWidth : 100,
        visibleHeight : 50,
        totalScrollItemWidth : 300,
        totalScrollItemHeight : 200
    }, overrides );
}

test( 'tick functions are pure: frozen input state is never mutated', () =>
{
    const fns = [
        TickLogic.fnNoScroll,
        TickLogic.fnHorizontalLtrPingPong,
        TickLogic.fnHorizontalRtlPingPong,
        TickLogic.fnHorizontalTtbPingPong,
        TickLogic.fnHorizontalBttPingPong,
        TickLogic.fnHorizontalLtr,
        TickLogic.fnHorizontalRtl,
        TickLogic.fnVerticalBtt,
        TickLogic.fnVerticalTtb
    ];

    for ( const fn of fns )
    {
        const state = Object.freeze( makeState( { pingPongCurrentDirection : 1 } ) );
        const snapshot = JSON.stringify( state );
        const result = fn( state, 16 );
        assert.strictEqual( JSON.stringify( state ), snapshot );
        assert.notStrictEqual( result.state, state );
    }
} );

test( 'fnNoScroll keeps state and requests no style update', () =>
{
    const state = makeState( { xPos : 42 } );
    const result = TickLogic.fnNoScroll( state, 16 );
    assert.strictEqual( result.transform, null );
    assert.deepStrictEqual( result.state, state );
} );

test( 'ltr ping-pong pauses and reverses at both boundaries', () =>
{
    // Moving right
    let result = TickLogic.fnHorizontalLtrPingPong(
        makeState( { xPos : 10, pingPongCurrentDirection : 1 } ), 16 );
    assert.strictEqual( result.state.xPos, 26 );
    assert.strictEqual( result.transform, 'translate3d(-26px,0,0)' );

    // Hitting the right boundary (xPos + visibleWidth > totalScrollItemWidth)
    result = TickLogic.fnHorizontalLtrPingPong(
        makeState( { xPos : 195, pingPongCurrentDirection : 1 } ), 16 );
    assert.strictEqual( result.state.xPos, 211 );
    assert.strictEqual( result.state.pingPongCurrentDirection, 0 );
    assert.strictEqual( result.state.pingPongNextDirection, -1 );

    // Pausing: delay counts down, then the pending direction takes over
    result = TickLogic.fnHorizontalLtrPingPong(
        makeState( { xPos : 211, pingPongCurrentDirection : 0, pingPongNextDirection : -1, pingPongPauseDelay : 30 } ), 16 );
    assert.strictEqual( result.state.pingPongCurrentDirection, 0 );
    assert.strictEqual( result.state.pingPongPauseDelay, 14 );

    result = TickLogic.fnHorizontalLtrPingPong(
        makeState( { xPos : 211, pingPongCurrentDirection : 0, pingPongNextDirection : -1, pingPongPauseDelay : 10 } ), 16 );
    assert.strictEqual( result.state.pingPongCurrentDirection, -1 );
    assert.strictEqual( result.state.pingPongPauseDelay, 2000 );

    // Moving left, back to the start
    result = TickLogic.fnHorizontalLtrPingPong(
        makeState( { xPos : 10, pingPongCurrentDirection : -1 } ), 16 );
    assert.strictEqual( result.state.xPos, -6 );
    assert.strictEqual( result.state.pingPongCurrentDirection, 0 );
    assert.strictEqual( result.state.pingPongNextDirection, 1 );
} );

test( 'rtl ping-pong clamps at the left boundary and schedules the reverse direction', () =>
{
    // Regression: the next direction must be written to the returned state,
    // not to some unrelated object, otherwise the scroller never turns around.
    const result = TickLogic.fnHorizontalRtlPingPong(
        makeState( { xPos : 5, pingPongCurrentDirection : 1, pingPongNextDirection : 1 } ), 16 );
    assert.strictEqual( result.state.xPos, 0 );
    assert.strictEqual( result.state.pingPongCurrentDirection, 0 );
    assert.strictEqual( result.state.pingPongNextDirection, -1 );
    assert.strictEqual( TickLogic._pingPongNextDirection, undefined );
} );

test( 'rtl ping-pong does not get stuck at the left boundary', () =>
{
    let state = makeState( {
        xPos : 200, // totalScrollItemWidth - visibleWidth
        pingPongCurrentDirection : 1,
        pingPongNextDirection : 1,
        pingPongPauseDelay : 100,
        pingPongDelay : 100
    } );

    let hitZero = false,
        movedRightAgain = false,
        returnedToZero = false;

    for ( let i = 0; i < 500; i++ )
    {
        state = TickLogic.fnHorizontalRtlPingPong( state, 16 ).state;
        assert.ok( state.xPos >= 0 && state.xPos <= 200, 'position stays within bounds' );

        if ( 0 === state.xPos && false === hitZero )
        {
            hitZero = true;
        }
        else if ( true === hitZero && state.xPos > 0 )
        {
            movedRightAgain = true;
        }
        else if ( true === movedRightAgain && 0 === state.xPos )
        {
            returnedToZero = true;
        }
    }

    // Reached the left boundary, moved right again after the pause
    // and kept oscillating instead of pushing left forever
    assert.ok( hitZero );
    assert.ok( movedRightAgain );
    assert.ok( returnedToZero );
} );

test( 'rtl ping-pong clamps at the right boundary', () =>
{
    const result = TickLogic.fnHorizontalRtlPingPong(
        makeState( { xPos : 195, pingPongCurrentDirection : -1 } ), 16 );
    assert.strictEqual( result.state.xPos, 200 );
    assert.strictEqual( result.state.pingPongCurrentDirection, 0 );
    assert.strictEqual( result.state.pingPongNextDirection, 1 );
} );

test( 'gapped mode clamps the position at the scroll item boundary', () =>
{
    // Gapped mode reuses the continuous logic with a padded scroll item,
    // so the position wraps once it passes the total scroll item width.
    const ltr = TickLogic.fnHorizontalLtr(
        makeState( { xPos : 295, totalScrollItemWidth : 300 } ), 16 );
    assert.strictEqual( ltr.state.xPos, 300 - 311 );
    assert.strictEqual( ltr.transform, 'translate3d(-' + ( 300 - 311 ) + 'px,0,0)' );

    // Same for the right to left variant
    const rtl = TickLogic.fnHorizontalRtl(
        makeState( { xPos : 10, totalScrollItemWidth : 300 } ), 16 );
    assert.strictEqual( rtl.state.xPos, 300 + ( 10 - 16 ) );
    assert.strictEqual( rtl.transform, 'translate3d(-' + ( rtl.state.xPos - 300 ) + 'px,0,0)' );
} );

test( 'continuous ltr scrolls and wraps within one frame', () =>
{
    const result = TickLogic.fnHorizontalLtr( makeState( { xPos : 100 } ), 16 );
    assert.strictEqual( result.state.xPos, 116 );
    assert.strictEqual( result.transform, 'translate3d(-116px,0,0)' );
} );

test( 'vertical btt scrolls upwards and wraps at the bottom', () =>
{
    let result = TickLogic.fnVerticalBtt( makeState( { yPos : 100 } ), 16 );
    assert.strictEqual( result.state.yPos, 116 );
    assert.strictEqual( result.transform, 'translate3d(0, -116px,0)' );

    result = TickLogic.fnVerticalBtt( makeState( { yPos : 195, totalScrollItemHeight : 200 } ), 16 );
    assert.strictEqual( result.state.yPos, 200 - 211 );
} );

test( 'vertical ttb scrolls downwards and wraps at the top', () =>
{
    let result = TickLogic.fnVerticalTtb( makeState( { yPos : 100, totalScrollItemHeight : 200 } ), 16 );
    assert.strictEqual( result.state.yPos, 200 + 84 );
    assert.strictEqual( result.transform, 'translate3d(0, -84px,0)' );

    result = TickLogic.fnVerticalTtb( makeState( { yPos : 5, totalScrollItemHeight : 200 } ), 16 );
    assert.strictEqual( result.state.yPos, 200 + ( 5 - 16 ) );
} );

test( 'vertical ttb ping-pong pauses and reverses at both boundaries', () =>
{
    // Moving up, clamping at -(totalScrollItemHeight - visibleHeight) = -150
    let result = TickLogic.fnHorizontalTtbPingPong(
        makeState( { yPos : -145, pingPongCurrentDirection : 1 } ), 16 );
    assert.strictEqual( result.state.yPos, -150 );
    assert.strictEqual( result.state.pingPongCurrentDirection, 0 );
    assert.strictEqual( result.state.pingPongNextDirection, -1 );
    assert.strictEqual( result.transform, 'translate3d(0,-150px, 0)' );

    // Moving down again after the pause, clamping at 0
    result = TickLogic.fnHorizontalTtbPingPong(
        makeState( { yPos : -5, pingPongCurrentDirection : -1 } ), 16 );
    assert.strictEqual( result.state.yPos, 0 );
    assert.strictEqual( result.state.pingPongCurrentDirection, 0 );
    assert.strictEqual( result.state.pingPongNextDirection, 1 );
} );

test( 'vertical btt ping-pong pauses and reverses at both boundaries', () =>
{
    // Moving down, clamping at 0
    let result = TickLogic.fnHorizontalBttPingPong(
        makeState( { yPos : -5, pingPongCurrentDirection : 1 } ), 16 );
    assert.strictEqual( result.state.yPos, 0 );
    assert.strictEqual( result.state.pingPongCurrentDirection, 0 );
    assert.strictEqual( result.state.pingPongNextDirection, -1 );

    // Moving up again after the pause, clamping at -150
    result = TickLogic.fnHorizontalBttPingPong(
        makeState( { yPos : -145, pingPongCurrentDirection : -1 } ), 16 );
    assert.strictEqual( result.state.yPos, -150 );
    assert.strictEqual( result.state.pingPongCurrentDirection, 0 );
    assert.strictEqual( result.state.pingPongNextDirection, 1 );
} );

test( 'speed constants remain unchanged', () =>
{
    assert.deepStrictEqual( Configuration.SPEED_HORIZONTAL, {
        superslow : 0.0125,
        slow : 0.03,
        medium : 0.05,
        fast : 0.125,
        superfast : 0.2
    } );
    assert.deepStrictEqual( Configuration.SPEED_VERTICAL, Configuration.SPEED_HORIZONTAL );
} );

test( 'speed ramps up from zero to the target value when easing is enabled', () =>
{
    const config = new Configuration( { easing : true, speed : 'fast' } );
    assert.strictEqual( config.speed, 0.125 );
    config._currentSpeed = 0;

    let previous = 0;
    for ( let i = 0; i < 500; i++ )
    {
        const current = config.getSpeed();
        assert.ok( current >= previous, 'speed must increase monotonically' );
        assert.ok( current <= 0.125, 'speed must not overshoot the target' );
        previous = current;
    }
    assert.ok( Math.abs( previous - 0.125 ) < 1e-6, 'speed converges to the target' );
} );

test( 'speed stays constant when easing is disabled', () =>
{
    const config = new Configuration( {} );
    assert.strictEqual( config.getSpeed(), 0.05 );
    assert.strictEqual( config.getSpeed(), 0.05 );
} );
