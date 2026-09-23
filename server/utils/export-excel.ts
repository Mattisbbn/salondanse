import ExcelJS from 'exceljs'

export interface ExcelColumnDefinition {
  header: string
  key: string
  width?: number
}

export interface GenerateExcelOptions {
  sheetName: string
  columns: ExcelColumnDefinition[]
  rows: Record<string, unknown>[]
}

/**
 * Génère un classeur Excel (.xlsx) stylisé aux couleurs de l'événement
 */
export async function generateExcelBuffer(options: GenerateExcelOptions): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Salon de la Danse d\'Angers 2027'
  workbook.created = new Date()

  const worksheet = workbook.addWorksheet(options.sheetName || 'Données', {
    views: [{ showGridLines: true }]
  })

  // Définition des colonnes
  worksheet.columns = options.columns.map(col => ({
    header: col.header,
    key: col.key,
    width: col.width || Math.max(col.header.length + 4, 15)
  }))

  // Stylisation de la ligne d'en-tête (Ligne 1)
  const headerRow = worksheet.getRow(1)
  headerRow.height = 26
  headerRow.font = {
    name: 'Arial',
    size: 11,
    bold: true,
    color: { argb: 'FFFFFFFF' }
  }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF7C3AED' } // Violet JayDance
  }
  headerRow.alignment = {
    vertical: 'middle',
    horizontal: 'center',
    wrapText: true
  }

  // Insertion des données
  for (const rowData of options.rows) {
    const row = worksheet.addRow(rowData)
    row.height = 20
    row.font = {
      name: 'Arial',
      size: 10
    }
    row.alignment = {
      vertical: 'middle'
    }

    // Bordures douces sur chaque cellule
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      }
    })
  }

  // Génération du buffer binaire
  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}
