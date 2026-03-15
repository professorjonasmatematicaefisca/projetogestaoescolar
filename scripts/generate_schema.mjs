const fs = require('fs');

const data = JSON.parse(fs.readFileSync('C:\\Users\\WINDOWS PRO\\.gemini\\antigravity\\brain\\b19b3efa-c45f-4b9a-9b16-a8a97dec48ea\\.system_generated\\steps\\261\\output.txt', 'utf8'));

let sql = '';
let foreignKeys = [];

data.tables.forEach(table => {
    sql += `CREATE TABLE public.${table.name.replace('public.', '')} (\n`;
    
    let columns = table.columns.map(col => {
        let colDef = `  "${col.name}" ${col.data_type}`;
        if (col.format && col.format.includes('[]')) {
            // Arrays are defined as base type followed by []
             if (col.data_type === 'ARRAY') {
                 colDef = `  "${col.name}" ${col.format.replace('_', '')}[]`;
             }
        }
        if (col.options && !col.options.includes('nullable')) {
            colDef += ' NOT NULL';
        }
        if (col.default_value) {
            colDef += ` DEFAULT ${col.default_value}`;
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
            // Need to defer FK creation to avoid circular deps
            foreignKeys.push({
                table: table.name.replace('public.', ''),
                fk_name: fk.name,
                source: fk.source.split('.')[2] || fk.source.split('.')[1],
                target_table: fk.target.split('.')[1],
                target_col: fk.target.split('.')[2]
            });
        });
    }
});

foreignKeys.forEach(fk => {
    sql += `ALTER TABLE public.${fk.table} ADD CONSTRAINT ${fk.fk_name} FOREIGN KEY ("${fk.source}") REFERENCES public.${fk.target_table} ("${fk.target_col}");\n`;
});

fs.writeFileSync('C:\\Users\\WINDOWS PRO\\Downloads\\educontrol-pro\\projetogestaoescolar\\scripts\\schema_migration.sql', sql);
console.log('Migration generated.');
