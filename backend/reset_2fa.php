<?php
$pdo = new PDO('sqlite:C:/sqlite/database.sqlite');
$pdo->exec("UPDATE users SET two_factor_enabled=0, two_factor_confirmed_at=NULL WHERE id=1");
echo "Reset done.\n";
$r = $pdo->query("SELECT id, email, two_factor_enabled, two_factor_confirmed_at FROM users WHERE id=1")->fetch(PDO::FETCH_ASSOC);
print_r($r);
