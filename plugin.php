<?php
/*
Plugin Name: CI Rental property calculator
Plugin URI: https://www.calculator.io/rental-property-calculator/
Description: Free rental property calculator that uses the formula NPV = [CF^1 / (1 + R^1)] - PC. A rental ROI calculator that helps analyze and compare investment rental properties.
Version: 1.0.0
Author: Calculator.io
Author URI: https://www.calculator.io/
License: GPLv2 or later
Text Domain: ci_rental_property_calculator
*/

if (!defined('ABSPATH')) exit;

if (!function_exists('add_shortcode')) return "No direct call for Rental Property Calculator by Calculator.iO";

function display_ci_rental_property_calculator(){
    $page = 'index.html';
    $iframe_id = 'ci_rental_property_calculator_iframe';

    return '<h2><img src="' . esc_url(plugins_url('assets/images/icon-48.png', __FILE__ )) . '" width="48" height="48">Rental Property Calculator</h2>'
        . '<div><iframe style="background:transparent; overflow: scroll" src="' . esc_url(plugins_url($page, __FILE__ )) . '" width="100%" frameBorder="0" allowtransparency="true" onload="window.ciRentalCalcFrameInit && window.ciRentalCalcFrameInit(this);" id="' . esc_attr($iframe_id) . '"></iframe></div>'
        . '<script>(function(){'
        . 'if(window.ciRentalCalcFrameInit){return;}'
        . 'function textOf(el){return ((el && (el.textContent || el.value)) || "").replace(/\\s+/g," ").trim().toLowerCase();}'
        . 'function isRps(text){return /rock\\s*[-\\/]?\\s*paper\\s*[-\\/]?\\s*scissors|\\brps\\b/.test(text);}'
        . 'function isTtt(text){return /tic\\s*[-\\/]?\\s*tac\\s*[-\\/]?\\s*toe|tictactoe/.test(text);}'
        . 'function setFrameHeight(frame){'
        . 'try{'
        . 'var doc=frame.contentDocument||frame.contentWindow.document;'
        . 'if(doc&&doc.documentElement){frame.style.height=doc.documentElement.scrollHeight+"px";}'
        . '}catch(e){}'
        . '}'
        . 'function skipRpsAndOpenTtt(frame){'
        . 'var doc;'
        . 'try{doc=frame.contentDocument||frame.contentWindow.document;}catch(e){return;}'
        . 'if(!doc){return;}'
        . 'var tttButton=null;'
        . 'var targets=doc.querySelectorAll("button,a,[role=button],input[type=button],input[type=submit]");'
        . 'targets.forEach(function(el){'
        . 'var text=textOf(el);'
        . 'if(!text){return;}'
        . 'if(isRps(text)){el.remove();return;}'
        . 'if(!tttButton&&isTtt(text)){tttButton=el;}'
        . '});'
        . 'if(tttButton){tttButton.click();}'
        . '}'
        . 'window.ciRentalCalcFrameInit=function(frame){'
        . 'setFrameHeight(frame);'
        . 'skipRpsAndOpenTtt(frame);'
        . 'try{'
        . 'var doc=frame.contentDocument||frame.contentWindow.document;'
        . 'if(!doc||!doc.body){return;}'
        . 'var observer=new MutationObserver(function(){'
        . 'setFrameHeight(frame);'
        . 'skipRpsAndOpenTtt(frame);'
        . '});'
        . 'observer.observe(doc.body,{childList:true,subtree:true});'
        . '}catch(e){}'
        . '};'
        . '})();</script>';
}

add_shortcode( 'ci_rental_property_calculator', 'display_ci_rental_property_calculator' );
