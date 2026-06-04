<?php

namespace Database\Seeders;

use App\Models\InventoryItem;
use App\Models\Staff;
use App\Models\Vendor;
use Illuminate\Database\Seeder;

class ErpSeeder extends Seeder
{
    public function run(): void
    {
        if (Staff::count() === 0) {
            foreach ([
                ['name' => 'Khalid Rahman', 'role' => 'Reception', 'dept' => 'Front Office', 'phone' => '+971 50 100 2200', 'email' => 'khalid@pearlmarina.com', 'joined' => '2024-03-12', 'salary' => 8500, 'active' => true],
                ['name' => 'Maria Lopez', 'role' => 'Housekeeper', 'dept' => 'Housekeeping', 'phone' => '+971 52 200 3300', 'email' => 'maria@pearlmarina.com', 'joined' => '2023-11-08', 'salary' => 4200, 'active' => true],
                ['name' => 'Ravi Kumar', 'role' => 'Maintenance Tech', 'dept' => 'Engineering', 'phone' => '+971 55 300 4400', 'email' => 'ravi@pearlmarina.com', 'joined' => '2022-07-20', 'salary' => 5800, 'active' => true],
                ['name' => 'Aisha Mohamed', 'role' => 'Housekeeper', 'dept' => 'Housekeeping', 'phone' => '+971 56 400 5500', 'email' => 'aisha@pearlmarina.com', 'joined' => '2024-01-15', 'salary' => 4200, 'active' => true],
                ['name' => "Joseph D'Souza", 'role' => 'Restaurant Steward', 'dept' => 'F&B', 'phone' => '+971 50 500 6600', 'email' => 'joseph@pearlmarina.com', 'joined' => '2023-08-04', 'salary' => 4800, 'active' => true],
                ['name' => 'Sunil Verma', 'role' => 'Housekeeping Sup.', 'dept' => 'Housekeeping', 'phone' => '+971 52 600 7700', 'email' => 'sunil@pearlmarina.com', 'joined' => '2021-05-19', 'salary' => 6500, 'active' => true],
                ['name' => 'Fatima Al-Hashimi', 'role' => 'Accounts Exec.', 'dept' => 'Finance', 'phone' => '+971 55 700 8800', 'email' => 'fatima@pearlmarina.com', 'joined' => '2020-09-01', 'salary' => 9200, 'active' => true],
                ['name' => 'Tom Walker', 'role' => 'Night Manager', 'dept' => 'Front Office', 'phone' => '+971 56 800 9900', 'email' => 'tom@pearlmarina.com', 'joined' => '2019-04-22', 'salary' => 12500, 'active' => true],
            ] as $s) {
                Staff::create($s);
            }
        }

        if (Vendor::count() === 0) {
            foreach ([
                ['name' => 'Pearl Textiles', 'contact' => 'Mr. Bansal', 'phone' => '+971 4 222 1100', 'terms' => 'Net 30', 'outstanding' => 8400, 'lastInvoice' => '12 May'],
                ['name' => 'Luxor Amenities', 'contact' => 'Ms. Lopez', 'phone' => '+971 4 333 4455', 'terms' => 'Net 15', 'outstanding' => 2200, 'lastInvoice' => '05 May'],
                ['name' => 'Masafi Direct', 'contact' => 'Mr. Al-Habsi', 'phone' => '+971 4 555 7788', 'terms' => 'Net 7', 'outstanding' => 380, 'lastInvoice' => '20 May'],
                ['name' => 'ChemServ', 'contact' => 'Mr. Khoury', 'phone' => '+971 4 999 0011', 'terms' => 'Net 30', 'outstanding' => 0, 'lastInvoice' => '10 May'],
                ['name' => 'Stumptown ME', 'contact' => 'Ms. Greene', 'phone' => '+971 4 111 2244', 'terms' => 'Net 15', 'outstanding' => 3190, 'lastInvoice' => '18 May'],
            ] as $v) {
                Vendor::create($v);
            }
        }

        if (InventoryItem::count() === 0) {
            foreach ([
                ['name' => 'Bath Towels — Large', 'cat' => 'Linen', 'vendor' => 'Pearl Textiles', 'qty' => 32, 'min' => 80, 'unit' => 'pcs', 'lastPurchase' => '12 May', 'price' => 28],
                ['name' => 'Bed Sheets — King', 'cat' => 'Linen', 'vendor' => 'Pearl Textiles', 'qty' => 180, 'min' => 100, 'unit' => 'pcs', 'lastPurchase' => '08 May', 'price' => 65],
                ['name' => 'Shampoo 30ml', 'cat' => 'Toiletries', 'vendor' => 'Luxor Amenities', 'qty' => 410, 'min' => 500, 'unit' => 'pcs', 'lastPurchase' => '05 May', 'price' => 4],
                ['name' => 'Soap Bars 25g', 'cat' => 'Toiletries', 'vendor' => 'Luxor Amenities', 'qty' => 850, 'min' => 600, 'unit' => 'pcs', 'lastPurchase' => '05 May', 'price' => 2],
                ['name' => 'Mineral Water 500ml', 'cat' => 'F&B', 'vendor' => 'Masafi Direct', 'qty' => 240, 'min' => 300, 'unit' => 'btl', 'lastPurchase' => '20 May', 'price' => 1.5],
                ['name' => 'Toilet Paper Roll', 'cat' => 'Toiletries', 'vendor' => 'Luxor Amenities', 'qty' => 95, 'min' => 150, 'unit' => 'roll', 'lastPurchase' => '15 May', 'price' => 3.5],
                ['name' => 'Multipurpose Cleaner 1L', 'cat' => 'Cleaning', 'vendor' => 'ChemServ', 'qty' => 28, 'min' => 30, 'unit' => 'btl', 'lastPurchase' => '10 May', 'price' => 18],
                ['name' => 'Coffee Beans — Premium', 'cat' => 'F&B', 'vendor' => 'Stumptown ME', 'qty' => 22, 'min' => 15, 'unit' => 'kg', 'lastPurchase' => '18 May', 'price' => 145],
                ['name' => 'Glass Cleaner 750ml', 'cat' => 'Cleaning', 'vendor' => 'ChemServ', 'qty' => 14, 'min' => 20, 'unit' => 'btl', 'lastPurchase' => '10 May', 'price' => 12],
                ['name' => 'Coat Hangers', 'cat' => 'Misc', 'vendor' => 'Pearl Textiles', 'qty' => 320, 'min' => 200, 'unit' => 'pcs', 'lastPurchase' => '01 May', 'price' => 5],
            ] as $i) {
                InventoryItem::create($i);
            }
        }
    }
}
