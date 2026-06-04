<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * All Setup & Settings tables for the hotel PMS.
 * Columns use the same camelCase keys as the frontend types so data
 * round-trips cleanly between the Next.js managers and the API.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('floors', function (Blueprint $t) {
            $t->id();
            $t->integer('number')->default(0);
            $t->string('name')->default('');
            $t->json('amenities')->nullable();
            $t->boolean('smokingAllowed')->default(false);
            $t->boolean('vipFloor')->default(false);
            $t->boolean('hasElevator')->default(true);
            $t->string('housekeepingZone')->default('Zone A');
            $t->string('status')->default('active');
            $t->timestamps();
        });

        Schema::create('rooms', function (Blueprint $t) {
            $t->id();
            $t->string('number')->default('');
            $t->string('category')->default('Deluxe');
            $t->integer('floor')->default(1);
            $t->string('bedConfig')->default('1 King');
            $t->integer('maxAdults')->default(2);
            $t->integer('maxChildren')->default(1);
            $t->integer('sizeSqft')->default(300);
            $t->string('view')->default('City');
            $t->integer('baseTariff')->default(0);
            $t->boolean('extraBedAllowed')->default(true);
            $t->integer('extraBedRate')->default(1500);
            $t->string('connectingRoom')->default('');
            $t->string('extension')->default('');
            $t->string('wifiSsid')->default('PearlGuest');
            $t->boolean('smoking')->default(false);
            $t->boolean('accessible')->default(false);
            $t->json('amenities')->nullable();
            $t->string('status')->default('active');
            $t->timestamps();
        });

        Schema::create('rate_plans', function (Blueprint $t) {
            $t->id();
            $t->string('code')->default('');
            $t->string('name')->default('');
            $t->boolean('inclBreakfast')->default(false);
            $t->boolean('inclLunch')->default(false);
            $t->boolean('inclDinner')->default(false);
            $t->integer('discountPct')->default(0);
            $t->boolean('refundable')->default(true);
            $t->boolean('active')->default(true);
            $t->timestamps();
        });

        Schema::create('seasons', function (Blueprint $t) {
            $t->id();
            $t->string('name')->default('');
            $t->string('from')->default('');
            $t->string('to')->default('');
            $t->decimal('multiplier', 5, 2)->default(1);
            $t->boolean('active')->default(true);
            $t->timestamps();
        });

        Schema::create('holidays', function (Blueprint $t) {
            $t->id();
            $t->string('name')->default('');
            $t->string('date')->default('');
            $t->string('kind')->default('national');
            $t->integer('surchargePct')->default(0);
            $t->timestamps();
        });

        Schema::create('fb_packages', function (Blueprint $t) {
            $t->id();
            $t->string('name')->default('');
            $t->string('type')->default('Breakfast');
            $t->integer('pax')->default(1);
            $t->integer('price')->default(0);
            $t->integer('gst')->default(5);
            $t->boolean('active')->default(true);
            $t->timestamps();
        });

        Schema::create('hall_packages', function (Blueprint $t) {
            $t->id();
            $t->string('name')->default('');
            $t->integer('capacity')->default(0);
            $t->integer('hourly')->default(0);
            $t->integer('halfDay')->default(0);
            $t->integer('fullDay')->default(0);
            $t->integer('setupFee')->default(0);
            $t->integer('gst')->default(18);
            $t->boolean('active')->default(true);
            $t->timestamps();
        });

        Schema::create('agents', function (Blueprint $t) {
            $t->id();
            $t->string('type')->default('Agent');
            $t->string('name')->default('');
            $t->string('contact')->default('');
            $t->string('phone')->default('');
            $t->string('email')->default('');
            $t->string('gstin')->default('');
            $t->bigInteger('creditLimit')->default(0);
            $t->integer('commissionPct')->default(0);
            $t->string('creditTerms')->default('Net 30');
            $t->boolean('active')->default(true);
            $t->timestamps();
        });

        Schema::create('gst_slabs', function (Blueprint $t) {
            $t->id();
            $t->string('label')->default('');
            $t->integer('from')->default(0);
            $t->integer('to')->nullable();
            $t->integer('rate')->default(0);
            $t->timestamps();
        });

        Schema::create('payment_methods', function (Blueprint $t) {
            $t->id();
            $t->string('name')->default('');
            $t->string('code')->default('');
            $t->string('type')->default('Cash');
            $t->decimal('feePct', 5, 2)->default(0);
            $t->string('settlement')->default('');
            $t->boolean('active')->default(true);
            $t->timestamps();
        });

        Schema::create('notification_templates', function (Blueprint $t) {
            $t->id();
            $t->string('event')->default('');
            $t->string('channel')->default('Email');
            $t->string('language')->default('English');
            $t->boolean('active')->default(true);
            $t->timestamps();
        });

        Schema::create('roles', function (Blueprint $t) {
            $t->id();
            $t->string('name')->default('');
            $t->integer('users')->default(0);
            $t->json('permissions')->nullable();
            $t->boolean('active')->default(true);
            $t->timestamps();
        });

        Schema::create('webhooks', function (Blueprint $t) {
            $t->id();
            $t->string('url')->default('');
            $t->string('events')->default('');
            $t->string('status')->default('active');
            $t->timestamps();
        });

        // Single-row settings sections stored as JSON, keyed by section id.
        Schema::create('app_settings', function (Blueprint $t) {
            $t->id();
            $t->string('key')->unique();
            $t->json('value')->nullable();
            $t->timestamps();
        });
    }

    public function down(): void
    {
        foreach ([
            'floors', 'rooms', 'rate_plans', 'seasons', 'holidays',
            'fb_packages', 'hall_packages', 'agents', 'gst_slabs',
            'payment_methods', 'notification_templates', 'roles', 'webhooks',
            'app_settings',
        ] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
