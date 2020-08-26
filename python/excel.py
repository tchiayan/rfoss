import win32com.client as  win32
import sys 
import json 
from numpy import array

excel = win32.Dispatch('Excel.Application')
workbook = excel.Workbooks.Add()
worksheet = workbook.Sheets("Sheet1")

def writeCells(worksheet , table , startrow = 1 , startcolumn = 1):
    for rowindex, row  in enumerate(table):
        worksheet.Range(worksheet.Cells(rowindex+startrow, startcolumn) , worksheet.Cells(rowindex+startrow, startcolumn+len(row)-1)).Value = row
        """for columnindex ,cell  in enumerate(row):
            if cell == "" or cell == None:
                pass
            else:
                worksheet.Cells(rowindex+startrow, columnindex+startcolumn).Value = cell"""

def mergeCells(worksheet, startRow , startCol , endRow, endCol):
    worksheet.Range(worksheet.Cells(startRow, startCol), worksheet.Cells(endRow, endCol)).Select() 
    selection = excel.Application.Selection
    selection.HorizontalAlignment = -4108
    selection.Merge()

def styleCells(worksheet, range_cell, color):
    if isinstance(range_cell[0], list) and isinstance(range_cell[1],list):
        worksheet.Range(worksheet.Cells(range_cell[0][0], range_cell[0][1]), worksheet.Cells(range_cell[1][0], range_cell[1][1])).Select() 
    elif isinstance(range_cell[0], int) and isinstance(range_cell[1],int):
        worksheet.Cells(range_cell[0],range_cell[1]).Select()
    else: 
        print("Error")
        return 

    selection = excel.Application.Selection
    selection.Interior.Color = color

def convertTable(worksheet , range_cell , tablename):
     if isinstance(range_cell[0], list) and isinstance(range_cell[1],list):
        _range = worksheet.Range(worksheet.Cells(range_cell[0][0], range_cell[0][1]), worksheet.Cells(range_cell[1][0], range_cell[1][1]))
        _table = worksheet.ListObjects.Add(1 , _range, True , 1)
        _table.Name = tablename

def addLineChart(worksheet, range_cell, title=None , height = None , width = None ):
    #worksheet.Range().Select()
    if isinstance(range_cell[0], list) and isinstance(range_cell[1],list):
        _range = worksheet.Range(worksheet.Cells(range_cell[0][0], range_cell[0][1]), worksheet.Cells(range_cell[1][0], range_cell[1][1]))

        shape = worksheet.Shapes.AddChart2(227, 4)
        
        shape.Left = worksheet.Cells(range_cell[0][0], range_cell[0][1]).Left
        shape.Top = worksheet.Cells(range_cell[0][0], range_cell[0][1]).Top
        shape.Select()

        excel.Application.ActiveChart.SetSourceData(_range)

        if not height == None:
            shape.Height =  height

        if not width == None:
            shape.Width = width

        if not title == None:
            excel.Application.ActiveChart.HasTitle = True
            excel.Application.ActiveChart.ChartTitle.Text = title 

def addNewWorksheet(name):
    worksheet = excel.Application.Worksheets.Add()
    worksheet.Name = name

    return worksheet

def addTickBorder(worksheet, range_cell):
    if isinstance(range_cell[0], list) and isinstance(range_cell[1],list):
        _range = worksheet.Range(worksheet.Cells(range_cell[0][0], range_cell[0][1]), worksheet.Cells(range_cell[1][0], range_cell[1][1]))
        _range.Select()
        
        selection = excel.Application.Selection
        for n in range(7,13):
            selection.Borders(n).LineStyle = 1
            selection.Borders(n).ColorIndex = 0
            selection.Borders(n).TintAndShade = 0
            selection.Borders(n).Weight = -4138

def rotateTextUp(worksheet, range_cell):
    if isinstance(range_cell[0], list) and isinstance(range_cell[1],list):
        _range = worksheet.Range(worksheet.Cells(range_cell[0][0], range_cell[0][1]), worksheet.Cells(range_cell[1][0], range_cell[1][1]))
        _range.Select()

        selection = excel.Application.Selection
        selection.HorizontalAlignment = -4108
        selection.Orientation = 90
        selection.VerticalAlignment = -4108
        selection.WrapText = True

def centerAndWrapText(worksheet, range_cell):
    if isinstance(range_cell[0], list) and isinstance(range_cell[1],list):
        _range = worksheet.Range(worksheet.Cells(range_cell[0][0], range_cell[0][1]), worksheet.Cells(range_cell[1][0], range_cell[1][1]))
        _range.Select()

        selection = excel.Application.Selection
        selection.HorizontalAlignment = -4108
        selection.VerticalAlignment = -4108
        selection.WrapText = True

def formatPercentage(worksheet, range_cell):
    if isinstance(range_cell[0], list) and isinstance(range_cell[1],list):
        _range = worksheet.Range(worksheet.Cells(range_cell[0][0], range_cell[0][1]), worksheet.Cells(range_cell[1][0], range_cell[1][1]))
        _range.Select()

        selection = excel.Application.Selection
        selection.NumberFormat = "0.00%"

def formatPercentageBar(worksheet, range_cell):
    if isinstance(range_cell[0], list) and isinstance(range_cell[1],list):
        _range = worksheet.Range(worksheet.Cells(range_cell[0][0], range_cell[0][1]), worksheet.Cells(range_cell[1][0], range_cell[1][1]))
        _range.Select()

        selection = excel.Application.Selection
        selection.FormatConditions.AddDatabar()
        selection.FormatConditions[1].BarBorder.Type = 1
        selection.FormatConditions[1].NegativeBarFormat.BorderColorType = 0
        selection.FormatConditions[1].BarBorder.Color.Color = 13012579
        selection.FormatConditions[1].BarBorder.Color.TintAndShade = 0

def addChart(worksheet , highchart, positionX=0, positionY=0 , width = 500 , height=230):
    chart = worksheet.ChartObjects().Add(positionX , positionY , width , height) # top , left , width , height
    chart.Name = highchart['id']
    chart.Chart.DisplayBlanksAs = 1
    #chart

    seriesCollection = chart.Chart.SeriesCollection()
    
    for series in highchart['series']:
        series['data']
        seriesObj = seriesCollection.NewSeries()
        seriesObj.Name = series['name']
        #print(series['data'])
        #print(["" if x == None else x for x in series['data']])
        seriesObj.Values = "={"+",".join(["#N/A" if x == None else str(x) for x in series['data']]) + "}"
        seriesObj.ChartType = 65
        if 'excelLineWidth' in series:
            seriesObj.Format.Line.Weight = series['excelLineWidth']
        
        if "marker" in series:
            if series['marker']:
                seriesObj.ChartType = 4

        if "dashStyle" in series:
            if series['dashStyle'] == "dash":
                seriesObj.Format.Line.DashStyle = 4 # 
        
        if "color" in series:
            seriesObj.Format.Line.ForeColor.RGB = 255 # red

    if "yAxis" in highchart:
        if len(highchart['yAxis']) == 1:
            if "labels" in highchart['yAxis'][0]:
                if "formatting" in highchart['yAxis'][0]["labels"]:
                    if  highchart['yAxis'][0]["labels"]["formatting"] == "percentage":
                        yaxis = chart.Chart.Axes(2)
                        yaxis.TickLabels.NumberFormat = "0.00%"
    if "xAxis" in highchart:
        if "categories" in highchart['xAxis']:
            axis = chart.Chart.Axes(1 , 1)
            axis.CategoryNames = highchart['xAxis']['categories']
    
    if "title" in highchart:
        if "text" in highchart['title']:
            chart.Chart.HasTitle = True 
            chart.Chart.ChartTitle.Text = highchart['title']['text']

    if "legend" in highchart:
        if "align" in highchart['legend']:
            chart.Chart.SetElement(101 if highchart['legend']['align'] == 'right' else 104)
        else:
            chart.Chart.SetElement(104)
    else:
        chart.Chart.SetElement(104)
    #print(seriesCollection)
print("Read input from nodejs")
steps = json.loads("\n".join(sys.stdin.readlines()))
#print("Input from nodejs: ", steps)

#print(steps)

try:
    for step in steps:
        if step['operation'] == 'write':
            writeCells(worksheet, step['data'] , step['row'] , step['col'])
        elif step['operation'] == 'merge':
            mergeCells(worksheet, step['row_start'] , step['col_start'] , step['row_end'], step['col_end'])
        elif step['operation'] == 'style_cell':
            styleCells(worksheet, step['position'] , step['color'])
        elif step['operation'] == 'to_table':
            convertTable(worksheet, step['position'] , step['tablename'])
        elif step['operation'] == 'add_line_chart':
            addLineChart(worksheet, step['position'], step['title'] , step['height'], step['width'])
        elif step['operation'] == 'change_sheetname':
            worksheet.Name = step['name']
        elif step['operation'] == 'add_new_sheet':
            worksheet = addNewWorksheet(step['name'])
        elif step['operation'] == 'add_thick_border':
            addTickBorder(worksheet , step['position'])
        elif step['operation'] == 'rotate_text_up':
            rotateTextUp(worksheet, step['position'])
        elif step['operation'] == 'center_wrap_text':
            centerAndWrapText(worksheet, step['position'])
        elif step['operation'] == 'format_percentage_bar':
            formatPercentageBar(worksheet, step['position'])
        elif step['operation'] == 'format_percentage':
            formatPercentage(worksheet, step['position'])
        elif step['operation'] == 'chart':
            print(type(step['highchart']))
            if isinstance(step['highchart'] , dict):
                addChart(worksheet , step['highchart'])
            elif isinstance(step['highchart'], list):
                # check list dimension
                a = array(step['highchart'])
                groupingRowGap = 50
                chartXgap = 5
                chartYgap = 5 
                currentX = step['x'] if 'x' in step else 0 
                currentY = 0
                itemX = 1
                if len(a.shape) == 2 : #two dimension chart 
                    for groupChart in step['highchart']:
                        for chart in groupChart:
                            if itemX == 1:
                                if chart == groupChart[-1]:
                                    addChart(worksheet, chart, (500*2+5)/2 - 500/2 , currentY)
                                else:
                                    addChart(worksheet, chart, currentX , currentY)
                                currentX = currentX + chartXgap + 500
                                itemX += 1
                            elif itemX == 2:
                                addChart(worksheet, chart, currentX , currentY)
                                currentX = step['x'] if 'x' in step else 0 
                                currentY = currentY + chartYgap + 230
                                itemX = 1

                        # group chart 
                        chartidgroup = [chart['id'] for chart in groupChart]
                        if len(chartidgroup) > 1:
                            worksheet.Shapes.Range(chartidgroup).Group()
                        currentY = currentY + groupingRowGap + 230
                        currentX = step['x'] if 'x' in step else 0 
                        itemX = 1
                    
                elif len(a.shape) == 1: #one dimension chart 
                    chartwidth = step['width']  if 'width' in step else 500
                    chartheight = step['height'] if 'height' in step else 230 
                    if 'column' in step:
                        if step['column'] == 1:
                            for chart in step['highchart']:
                                addChart(worksheet, chart, currentX , currentY, chartwidth, chartheight)
                                currentX = step['x'] if 'x' in step else 0 
                                currentY = currentY + chartYgap + chartheight
                            # group chart 
                            chartidgroup = [chart['id'] for chart in step['highchart']]
                            if len(chartidgroup) > 1:
                                worksheet.Shapes.Range(chartidgroup).Group()
                        else:
                            for chart in step['highchart']:
                                
                                if itemX == 1:
                                    if chart == step['highchart'][-1]:
                                        addChart(worksheet, chart, (chartwidth*2+5)/2 - chartwidth/2 , currentY , chartwidth, chartheight)
                                    else:
                                        addChart(worksheet, chart, currentX , currentY, chartwidth, chartheight)
                                    currentX = currentX + chartXgap + chartwidth
                                    itemX += 1
                                elif itemX == 2:
                                    addChart(worksheet, chart, currentX , currentY, chartwidth, chartheight)
                                    currentX = step['x'] if 'x' in step else 0 
                                    currentY = currentY + chartYgap + chartheight
                                    itemX = 1
                            # group chart 
                            chartidgroup = [chart['id'] for chart in step['highchart']]
                            if len(chartidgroup) > 1:
                                worksheet.Shapes.Range(chartidgroup).Group()
                    else:
                        for chart in step['highchart']:
                                
                            if itemX == 1:
                                if chart == step['highchart'][-1]:
                                    addChart(worksheet, chart, (chartwidth*2+5)/2 - chartwidth/2 , currentY , chartwidth, chartheight)
                                else:
                                    addChart(worksheet, chart, currentX , currentY, chartwidth, chartheight)
                                currentX = currentX + chartXgap + chartwidth
                                itemX += 1
                            elif itemX == 2:
                                addChart(worksheet, chart, currentX , currentY, chartwidth, chartheight)
                                currentX = step['x'] if 'x' in step else 0 
                                currentY = currentY + chartYgap + chartheight
                                itemX = 1
                        # group chart 
                        chartidgroup = [chart['id'] for chart in step['highchart']]
                        if len(chartidgroup) > 1:
                            worksheet.Shapes.Range(chartidgroup).Group()
finally:    
    excel.Visible = True

print("Excel application end")