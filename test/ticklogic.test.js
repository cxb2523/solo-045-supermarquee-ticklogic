import { test } from 'node:test';
import assert from 'node:assert/strict';

import { TickLogic } from '../src/core/TickLogic.js';

function createState( overrides = {} )
{
    return Object.assign( {
        xPos : 0,
        yPos : 0,
        pingPongCurrentDirection : 1,
        pingPongNextDirection : -1,
        pingPongPauseDelay : 0,
        speed : 0.5,
        currentSpeed : 0.5,
        easing : false,
        easingValue : 0.025,
        pingPongDelay : 2000,
        dimensions : {
            visibleWidth : 100,
            visibleHeight : 100,
            totalScrollItemWidth : 300,
            totalScrollItemHeight : 300
        }
    }, overrides );
}

test( 'horizontal ltr ping-pong: pauses at the right boundary, then reverses', () =>
{
    // Moving right, crossing the right boundary -> pause, next direction is left
    let result = TickLogic.fnHorizontalLtrPingPong(
        createState( { xPos : 180, pingPongCurrentDirection : 1 } ), 100 );
    assert.equal( result.state.xPos, 230 );
    assert.equal( result.state.pingPongCurrentDirection, 0 );
    assert.equal( result.state.pingPongNextDirection, -1 );
    assert.deepEqual( result.offset, { x : -230, y : 0 } );

    // While paused the position must not move and the delay counts down
    result = TickLogic.fnHorizontalLtrPingPong(
        createState( { xPos : 230, pingPongCurrentDirection : 0, pingPongNextDirection : -1, pingPongPauseDelay : 50 } ), 30 );
    assert.equal( result.state.xPos, 230 );
    assert.equal( result.state.pingPongCurrentDirection, 0 );
    assert.equal( result.state.pingPongPauseDelay, 20 );
    assert.deepEqual( result.offset, { x : -230, y : 0 } );

    // Pause expired -> movement resumes into the pending direction, delay rearmed
    result = TickLogic.fnHorizontalLtrPingPong(
        createState( { xPos : 230, pingPongCurrentDirection : 0, pingPongNextDirection : -1, pingPongPauseDelay : 10 } ), 20 );
    assert.equal( result.state.pingPongCurrentDirection, -1 );
    assert.equal( result.state.pingPongPauseDelay, 2000 );

    // Moving left, reaching the left boundary -> pause, next direction is right
    result = TickLogic.fnHorizontalLtrPingPong(
        createState( { xPos : 30, pingPongCurrentDirection : -1 } ), 100 );
    assert.equal( result.state.xPos, -20 );
    assert.equal( result.state.pingPongCurrentDirection, 0 );
    assert.equal( result.state.pingPongNextDirection, 1 );
} );

test( 'horizontal rtl ping-pong: pauses at both boundaries and keeps bouncing', () =>
{
    // Paused at the right edge -> pause expires, movement starts towards the left edge
    let result = TickLogic.fnHorizontalRtlPingPong(
        createState( { xPos : 200, pingPongCurrentDirection : 0, pingPongNextDirection : -1, pingPongPauseDelay : 10 } ), 20 );
    assert.equal( result.state.pingPongCurrentDirection, -1 );
    assert.equal( result.state.pingPongPauseDelay, 2000 );

    // Moving right, clamped at the right boundary -> pause, next direction is left
    result = TickLogic.fnHorizontalRtlPingPong(
        createState( { xPos : 180, pingPongCurrentDirection : -1 } ), 100 );
    assert.equal( result.state.xPos, 200 );
    assert.equal( result.state.pingPongCurrentDirection, 0 );
    assert.equal( result.state.pingPongNextDirection, 1 );
    assert.deepEqual( result.offset, { x : -200, y : 0 } );

    // Pause expired -> movement resumes to the left
    result = TickLogic.fnHorizontalRtlPingPong(
        createState( { xPos : 200, pingPongCurrentDirection : 0, pingPongNextDirection : 1, pingPongPauseDelay : 10 } ), 20 );
    assert.equal( result.state.pingPongCurrentDirection, 1 );

    // Moving left, clamped at the left boundary -> pause, next direction must be right (-1).
    // Regression: this used to write TickLogic._pingPongNextDirection on the module object,
    // so the instance never received the new direction and got stuck at the left edge.
    result = TickLogic.fnHorizontalRtlPingPong(
        createState( { xPos : 30, pingPongCurrentDirection : 1 } ), 100 );
    assert.equal( result.state.xPos, 0 );
    assert.equal( result.state.pingPongCurrentDirection, 0 );
    assert.equal( result.state.pingPongNextDirection, -1 );
    assert.ok( result.offset.x == 0 );
    assert.ok( result.offset.y === 0 );

    // Pause expired -> direction -1 resumes, the position must move away from the left edge
    result = TickLogic.fnHorizontalRtlPingPong(
        createState( { xPos : 0, pingPongCurrentDirection : 0, pingPongNextDirection : -1, pingPongPauseDelay : 10 } ), 20 );
    assert.equal( result.state.pingPongCurrentDirection, -1 );

    result = TickLogic.fnHorizontalRtlPingPong( result.state, 100 );
    assert.ok( result.state.xPos > 0 );
    assert.ok( result.offset.x < 0 );
} );

test( 'gapped/continuous rtl: position is clamped into the scroll item range', () =>
{
    // Crossing the left edge wraps the position back into [0, totalScrollItemWidth)
    let result = TickLogic.fnHorizontalRtl(
        createState( { xPos : 30 } ), 100 );
    assert.equal( result.state.xPos, 280 );
    assert.ok( result.state.xPos >= 0 && result.state.xPos < 300 );
    assert.deepEqual( result.offset, { x : 20, y : 0 } );

    // Regular advance without boundary crossing (steady state range is
    // [totalScrollItemWidth, 2 * totalScrollItemWidth), the offset moves by dt * speed)
    result = TickLogic.fnHorizontalRtl(
        createState( { xPos : 400 } ), 100 );
    assert.equal( result.state.xPos, 350 );
    assert.deepEqual( result.offset, { x : -50, y : 0 } );
} );

test( 'gapped/continuous ltr: advances by dt * speed', () =>
{
    const result = TickLogic.fnHorizontalLtr(
        createState( { xPos : 100 } ), 100 );
    assert.equal( result.state.xPos, 150 );
    assert.deepEqual( result.offset, { x : -150, y : 0 } );
} );

test( 'easing: speed ramps up from zero towards the target speed', () =>
{
    let state = createState( {
        easing : true,
        easingValue : 0.025,
        speed : 0.05,
        currentSpeed : 0,
        dimensions : {
            visibleWidth : 100,
            visibleHeight : 100,
            totalScrollItemWidth : 1000000,
            totalScrollItemHeight : 1000000
        }
    } );

    let previousSpeed = 0,
        previousStep = 0;
    for ( let i = 0; i < 600; i++ )
    {
        const result = TickLogic.fnHorizontalLtr( state, 16 );
        assert.ok( result.state.currentSpeed > previousSpeed );
        assert.ok( result.state.currentSpeed < 0.05 );

        // Displacement per tick grows while the speed ramps up
        const step = result.state.xPos - state.xPos;
        assert.ok( step >= previousStep );
        previousStep = step;
        previousSpeed = result.state.currentSpeed;
        state = result.state;
    }
    assert.ok( Math.abs( state.currentSpeed - 0.05 ) < 1e-6 );
} );

test( 'no easing: full target speed applies immediately', () =>
{
    const result = TickLogic.fnHorizontalLtr(
        createState( { easing : false, speed : 0.05, currentSpeed : 0 } ), 100 );
    assert.equal( result.state.xPos, 5 );
    assert.equal( result.state.currentSpeed, 0 );
} );

test( 'vertical btt/ttb: advance and clamp into the scroll item range', () =>
{
    let result = TickLogic.fnVerticalBtt(
        createState( { yPos : 100 } ), 100 );
    assert.equal( result.state.yPos, 150 );
    assert.deepEqual( result.offset, { x : 0, y : -150 } );

    result = TickLogic.fnVerticalTtb(
        createState( { yPos : 30 } ), 100 );
    assert.equal( result.state.yPos, 280 );
    assert.ok( result.state.yPos >= 0 && result.state.yPos < 300 );
    assert.deepEqual( result.offset, { x : 0, y : 20 } );
} );

test( 'vertical ttb ping-pong: clamps at boundaries and reverses after the pause', () =>
{
    // Moving up, clamped at the far boundary of the scroll range
    let result = TickLogic.fnHorizontalTtbPingPong(
        createState( { yPos : -180, pingPongCurrentDirection : 1 } ), 100 );
    assert.equal( result.state.yPos, -200 );
    assert.equal( result.state.pingPongCurrentDirection, 0 );
    assert.equal( result.state.pingPongNextDirection, -1 );
    assert.deepEqual( result.offset, { x : 0, y : -200 } );

    // Pause expired -> movement resumes downwards
    result = TickLogic.fnHorizontalTtbPingPong(
        createState( { yPos : -200, pingPongCurrentDirection : 0, pingPongNextDirection : -1, pingPongPauseDelay : 10 } ), 20 );
    assert.equal( result.state.pingPongCurrentDirection, -1 );

    // Moving down, clamped at the top boundary -> pause, next direction is up
    result = TickLogic.fnHorizontalTtbPingPong(
        createState( { yPos : -30, pingPongCurrentDirection : -1 } ), 100 );
    assert.equal( result.state.yPos, 0 );
    assert.equal( result.state.pingPongCurrentDirection, 0 );
    assert.equal( result.state.pingPongNextDirection, 1 );
} );

test( 'vertical btt ping-pong: clamps at the boundaries and reverses', () =>
{
    let result = TickLogic.fnHorizontalBttPingPong(
        createState( { yPos : -30, pingPongCurrentDirection : 1 } ), 100 );
    assert.equal( result.state.yPos, 0 );
    assert.equal( result.state.pingPongCurrentDirection, 0 );
    assert.equal( result.state.pingPongNextDirection, -1 );
    assert.deepEqual( result.offset, { x : 0, y : 0 } );

    result = TickLogic.fnHorizontalBttPingPong(
        createState( { yPos : -180, pingPongCurrentDirection : -1 } ), 100 );
    assert.equal( result.state.yPos, -200 );
    assert.equal( result.state.pingPongCurrentDirection, 0 );
    assert.equal( result.state.pingPongNextDirection, 1 );
} );

test( 'fnNoScroll: keeps the state and reports no offset', () =>
{
    const result = TickLogic.fnNoScroll( createState( { xPos : 10, yPos : 20 } ), 100 );
    assert.equal( result.state.xPos, 10 );
    assert.equal( result.state.yPos, 20 );
    assert.deepEqual( result.offset, { x : 0, y : 0 } );
} );

test( 'tick functions are pure: input snapshots are never mutated', () =>
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
        const state = createState();
        Object.freeze( state.dimensions );
        Object.freeze( state );

        const result = fn( state, 100 );
        assert.notEqual( result.state, state );
        assert.deepEqual( state, createState() );
    }
} );
