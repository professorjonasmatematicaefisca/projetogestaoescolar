const fs = require('fs');

const data = JSON.parse(fs.readFileSync('C:\\Users\\WINDOWS PRO\\.gemini\\antigravity\\brain\\b19b3efa-c45f-4b9a-9b16-a8a97dec48ea\\.system_generated\\steps\\261\\output.txt', 'utf8'));

let sql = '';
let foreignKeys = [];

data.tables.forEach(table => {
    sql += `CREATE TABLE IF NOT EXISTS public.${table.name.replace('public.', '')} (\n`;
    
    let columns = table.columns.map(col => {
        let colDef = `  "${col.name}" ${col.data_type}`;
        if (col.data_type === 'ARRAY') {
            colDef = `  "${col.name}" text[]`;
            if (col.format === '_uuid') colDef = `  "${col.name}" uuid[]`;
        }
        if (col.options && !col.options.includes('nullable')) {
            colDef += ' NOT NULL';
        }
        if (col.options && col.options.includes('unique')) {
            colDef += ' UNIQUE';
        }
        if (col.default_value) {
            let def = col.default_value;
            // remove schema prefix from extensions if exists because they might not be enabled or created differently
            if (def.includes('extensions.')) def = def.replace('extensions.', '');
            colDef += ` DEFAULT ${def}`;
        }
        if (col.check) {
            colDef += ` CHECK (${col.check})`;
        }
        return colDef;
    });

    if (table.primary_keys && table.primary_keys.length > 0) {
        columns.push(`  PRIMARY KEY ("${table.primary_keys.join('", "')}")`);
    }

    sql += columns.join(',\n');
    sql += `\n);\n\n`;

    if (table.rls_enabled) {
        sql += `ALTER TABLE public.${table.name.replace('public.', '')} ENABLE ROW LEVEL SECURITY;\n\n`;
    }

    if (table.foreign_key_constraints && table.foreign_key_constraints.length > 0) {
        table.foreign_key_constraints.forEach(fk => {
            let sourceTable = fk.source.split('.')[1];
            if (sourceTable === table.name.replace('public.', '')) {
                foreignKeys.push({
                    table: sourceTable,
                    fk_name: fk.name,
                    source: fk.source.split('.')[2],
                    target_table: fk.target.split('.')[1],
                    target_col: fk.target.split('.')[2] || fk.target.split('.')[1]
                });
            }
        });
    }
});

// Avoid duplicate constraints or missing targets by just adding them softly if needed, but we do it as commands
foreignKeys.forEach(fk => {
    sql += `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '${fk.fk_name}') THEN
        ALTER TABLE public.${fk.table} ADD CONSTRAINT ${fk.fk_name} FOREIGN KEY ("${fk.source}") REFERENCES public.${fk.target_table} ("${fk.target_col}");
    END IF;
END $$;\n\n`;
});

fs.writeFileSync('C:\\Users\\WINDOWS PRO\\Downloads\\educontrol-pro\\projetogestaoescolar\\scripts\\schema_migration.sql', sql);
console.log('Migration generated.');
