import pandas as pd
import re

class bisector:
    def __init__(self, conn, sitename, bisector1, bisector2, outputExcelName,startDate, endDate , beforeBisector, afterBisector ):
        self.conn = conn
        self.sitename = sitename
        self.bisec1 = bisector1
        self.bisec2 = bisector2
        self.beforeBisector = beforeBisector
        self.afterBisector = afterBisector
        self.startDate = startDate
        self.endDate = endDate

        self.writer = pd.ExcelWriter(outputExcelName, engine="xlsxwriter")

        self.layerSeries = [
            {'title':'DL User Througput (Mbps)','series':"sum([(2016)DL User Average Throughput(Mbps)])"},
            {'title':"Total DL Traffic Volumn(GB)",'series':"sum([(2016)Total DL Traffic Volume(GB)])"},
            {'title':"Avg No. of user",'series':"sum([Avg No_ of user(number)])"},
            {'title':"PRB DL (%)", 'series':"sum([PRB Usage DL(%)])"},
            {'title':"Ave CQI","series":"sum([(2016)CQI Avg])"},
            {'title':'DL Cell Edge Throughput','series':"sum([(2017)DL BorderUE Throughput(Mbps)])"},
            {'title':'CA Pcell User Traffic','series':"sum([L_Traffic_User_PCell_DL_Avg])"},
            {'title':'CA Scell User Traffic','series':"sum([L_Traffic_User_SCell_DL_Avg])"},
        ]

        self.bisectorSeries = [
            {'title':'CQI Average','series':"sum([(2016)CQI Avg])"},
            {'title':'DL User Average Throughput (Mbps)','series':"sum([(2016)DL User Average Throughput(Mbps)])"},
            {'title':'PRB Usage DL (%)','series':"sum([PRB Usage DL(%)])"},
            {'title':'CSSR (%)','series':"sum([CSSR(%)])"},
            {'title':'Call Drop','series':"sum([(2016)Call Drop Rate include MME(%)])"},
            {'title':'HO Success Rate(%)','series':"sum([(2016)HO Success Rate(%)])"},
            {'title':'CSFB Preparation Success Rate(%)','series':"sum([(2016)CSFB Preparation Success Rate(%)])"},
            {'title':'DL Cell Edge Throughput','series':"sum([(2017)DL BorderUE Throughput(Mbps)])"},
        ]

        self.kpiseries = [
            {'title':'CSSR (%)','series':"sum([CSSR(%)])", 'targetName':'CSSR Baseline', 'targetValue':95},
            {'title':'DCR','series':"sum([(2016)Call Drop Rate include MME(%)])", 'targetName':'DCR Baseline', 'targetValue':2.5},
            {'title':'HOSR','series':"sum([(2016)HO Success Rate(%)])", 'targetName':'HOSR Baseline', 'targetValue':97},
            {'title':'CSFB','series':"sum([(2016)CSFB Preparation Success Rate(%)])", 'targetName':'CSFB Baseline', 'targetValue':98.5},
        ]

        self.combinedSeries = [
            {'title':"Total DL Traffic Volumn(GB)",'series':"sum([(2016)Total DL Traffic Volume(GB)])"},
            {'title':"Avg No. of user",'series':"sum([Avg No_ of user(number)])"},
        ]

    def tadistribution_table(self, title, series, cells , afterBisector, writer, colcursor, rowcursor, chartcolcursor, chartrowcursor, sheetname = "TA"):
        series = [
            'printf("%.2f%",100*sum([L_RA_TA_UE_Index0])/sum([L_RA_TA_UE_0-11]))','printf("%.2f%",100*sum([L_RA_TA_UE_Index1])/sum([L_RA_TA_UE_0-11]))','printf("%.2f%",100*sum([L_RA_TA_UE_Index2])/sum([L_RA_TA_UE_0-11]))','printf("%.2f%",100*sum([L_RA_TA_UE_Index3])/sum([L_RA_TA_UE_0-11]))',
            'printf("%.2f%",100*sum([L_RA_TA_UE_Index4])/sum([L_RA_TA_UE_0-11]))','printf("%.2f%",100*sum([L_RA_TA_UE_Index5])/sum([L_RA_TA_UE_0-11]))','printf("%.2f%",100*sum([L_RA_TA_UE_Index6])/sum([L_RA_TA_UE_0-11]))','printf("%.2f%",100*sum([L_RA_TA_UE_Index7])/sum([L_RA_TA_UE_0-11]))',
            'printf("%.2f%",100*sum([L_RA_TA_UE_Index8])/sum([L_RA_TA_UE_0-11]))','printf("%.2f%",100*sum([L_RA_TA_UE_Index9])/sum([L_RA_TA_UE_0-11]))','printf("%.2f%",100*sum([L_RA_TA_UE_Index10])/sum([L_RA_TA_UE_0-11]))','printf("%.2f%",100*sum([L_RA_TA_UE_Index11])/sum([L_RA_TA_UE_0-11]))']

        columns = [
            'Cell Name',
            '(0m - 78m)','(78m - 234m)','(234m - 546m)','(546m - 1014m)',
            '(1014m - 1950m)','(1950m - 3510m)','(3510m - 6630m)','(6630m - 14430m)',
            '(14430m -30030m)','(30030m - 53430m)','(53430m - 76830m)','(> - 76830m)',
        ]
    
        conn = self.conn
        if conn:
            cursor = conn.cursor()
            data = []
            
            # Query cell bisector
            query = 'SELECT [Cell Name] , {} FROM maxis_lte WHERE [Cell Name] LIKE "{}%" and date([Date]) = date("{}") GROUP BY [Cell Name]'.format(",".join(series), cells , self.afterBisector)
            
            for row in cursor.execute(query):
                data.append(list(row))

            if len(data) == 0:
                print("---- Data Empty ----")
                return writer, colcursor, rowcursor, chartcolcursor, chartrowcursor

            df = pd.DataFrame(data, columns=columns)
            df = df.set_index("Cell Name")

            row = len(df.index) # number of row 
            #col = len(df.columns) # number of column excluded index

            rawdatasheetname = sheetname + "(RAW)"

            df.to_excel(writer, sheet_name=rawdatasheetname, startcol=colcursor, startrow=rowcursor+1)

            wb = writer.book
            ws = wb.get_worksheet_by_name(rawdatasheetname)
            if ws:
                ws.write_string(rowcursor, colcursor, title)

            # formatting
            
            # calculate cursor
            rowcursor += row + 3 # add one row due to current row data exist, one row for title and one row for cosmetic

        return writer, colcursor, rowcursor, chartcolcursor, chartrowcursor

    def tadistribution_all(self, title, series, cells , afterBisector, writer, colcursor, rowcursor, chartcolcursor, chartrowcursor, sheetname = "TA"):
        series = [
            'sum([L_RA_TA_UE_Index0])','sum([L_RA_TA_UE_Index1])','sum([L_RA_TA_UE_Index2])','sum([L_RA_TA_UE_Index3])',
            'sum([L_RA_TA_UE_Index4])','sum([L_RA_TA_UE_Index5])','sum([L_RA_TA_UE_Index6])','sum([L_RA_TA_UE_Index7])',
            'sum([L_RA_TA_UE_Index8])','sum([L_RA_TA_UE_Index9])','sum([L_RA_TA_UE_Index10])','sum([L_RA_TA_UE_Index11])']

        columns = [
            'Cell',
            '(0m - 78m)','(78m - 234m)','(234m - 546m)','(546m - 1014m)',
            '(1014m - 1950m)','(1950m - 3510m)','(3510m - 6630m)','(6630m - 14430m)',
            '(14430m -30030m)','(30030m - 53430m)','(53430m - 76830m)','(> - 76830m)',
        ]
    
        conn = self.conn
        if conn:
            cursor = conn.cursor()
            data = []
            
            # Query cell bisector
            query = 'SELECT [Cell Name] , {} FROM maxis_lte WHERE [Cell Name] LIKE "{}%" and date([Date]) = date("{}") GROUP BY [Cell Name]'.format(",".join(series), cells , self.afterBisector)
            
            for row in cursor.execute(query):
                data.append(list(row))

            if len(data) == 0:
                print("---- Data Empty ----")
                return writer, colcursor, rowcursor, chartcolcursor, chartrowcursor

            df = pd.DataFrame(data, columns=columns)
            df = df.set_index("Cell")
            
            row = len(df.index) # number of row 
            col = len(df.columns) # number of column excluded index

            rawdatasheetname = sheetname + "(RAW)"

            df.to_excel(writer, sheet_name=rawdatasheetname, startcol=colcursor, startrow=rowcursor+1)

            wb = writer.book
            ws = wb.get_worksheet_by_name(rawdatasheetname)
            if ws:
                ws.write_string(rowcursor, colcursor, title)
            ws = wb.get_worksheet_by_name(sheetname)
            if not ws:
                ws = wb.add_worksheet(sheetname)

            chart = wb.add_chart({"type":"line"})

            for x in range(rowcursor+2, rowcursor+2+row):
                chart.add_series({
                    'name':[rawdatasheetname, x, colcursor],
                    'categories': [rawdatasheetname, rowcursor + 1, colcursor + 1 , rowcursor + 1, colcursor + col],
                    'values':[rawdatasheetname, x, colcursor + 1 , x, colcursor + col]
                })

            # Configure the chart axes.
            chart.set_title({'name':title})
            chart.set_y_axis({'major_gridlines': {'visible': True}})  
            
            # Set a default data table on the X-Axis.
            #chart.set_table({'show_keys':True})

            chart.set_legend({'position':'bottom'})
            chart.set_size({'width':959, 'height':315}) # 15 columns, 16 rows
            
            # Insert the chart into the worksheet.
            ws.insert_chart(chartrowcursor, chartcolcursor, chart)

            # calculate cursor
            rowcursor += row + 3 # add one row due to current row data exist, one row for title and one row for cosmetic
            chartrowcursor += 16 # chart size take approximate 16 rows

        return writer, colcursor, rowcursor, chartcolcursor, chartrowcursor

    def tadistribution_cell(self, title, series, cell1, cell2 , afterBisector, writer, colcursor, rowcursor, chartcolcursor, chartrowcursor, sheetname="TA"):
        series = [
            'sum([L_RA_TA_UE_Index0])','sum([L_RA_TA_UE_Index1])','sum([L_RA_TA_UE_Index2])','sum([L_RA_TA_UE_Index3])',
            'sum([L_RA_TA_UE_Index4])','sum([L_RA_TA_UE_Index5])','sum([L_RA_TA_UE_Index6])','sum([L_RA_TA_UE_Index7])',
            'sum([L_RA_TA_UE_Index8])','sum([L_RA_TA_UE_Index9])','sum([L_RA_TA_UE_Index10])','sum([L_RA_TA_UE_Index11])']

        columns = [
            'Cell',
            'Sum of (0m - 78m)','Sum of (78m - 234m)','Sum of (234m - 546m)','Sum of (546m - 1014m)',
            'Sum of (1014m - 1950m)','Sum of (1950m - 3510m)','Sum of (3510m - 6630m)','Sum of (6630m - 14430m)',
            'Sum of (14430m -30030m)','Sum of (30030m - 53430m)','Sum of (53430m - 76830m)','Sum of (> - 76830m)',
        ]

        conn = self.conn
        if conn:
            cursor = conn.cursor()
            data = []
            
            # Query cell bisector
            query = 'SELECT [Cell Name] , {} FROM maxis_lte WHERE ([Cell Name] = "{}" or [Cell Name] = "{}") and date([Date]) = date("{}") GROUP BY [Cell Name]'.format(",".join(series), cell1 , cell2 , self.afterBisector)
            
            for row in cursor.execute(query):
                data.append(list(row))

            if len(data) == 0:
                print("---- Data Empty ----")
                return writer, colcursor, rowcursor, chartcolcursor, chartrowcursor

            df = pd.DataFrame(data, columns=columns)
            df = df.set_index("Cell")
            
            row = len(df.index) # number of row 
            col = len(df.columns) # number of column excluded index

            rawdatasheetname = sheetname + "(RAW)"

            df.to_excel(writer, sheet_name=rawdatasheetname, startcol=colcursor, startrow=rowcursor+1)

            wb = writer.book
            ws = wb.get_worksheet_by_name(rawdatasheetname)
            if ws:
                ws.write_string(rowcursor, colcursor, title)
            ws = wb.get_worksheet_by_name(sheetname)
            if not ws:
                ws = wb.add_worksheet(sheetname)

            chart = wb.add_chart({"type":"line"})

            for x in range(rowcursor+2, rowcursor+2+row):
                chart.add_series({
                    'name':[rawdatasheetname, x, colcursor],
                    'categories': [rawdatasheetname, rowcursor + 1, colcursor + 1 , rowcursor + 1, colcursor + col],
                    'values':[rawdatasheetname, x, colcursor + 1 , x, colcursor + col]
                })

            # Configure the chart axes.
            chart.set_title({'name':title})
            chart.set_y_axis({'major_gridlines': {'visible': True}})  
            
            # Set a default data table on the X-Axis.
            chart.set_table({'show_keys':True})

            chart.set_legend({'none':True})
            chart.set_size({'width':959, 'height':315}) # 15 columns, 16 rows
            
            # Insert the chart into the worksheet.
            ws.insert_chart(chartrowcursor, chartcolcursor, chart)

            # calculate cursor
            rowcursor += row + 3 # add one row due to current row data exist, one row for title and one row for cosmetic
            chartrowcursor += 16 # chart size take approximate 16 rows

        return writer, colcursor, rowcursor, chartcolcursor, chartrowcursor

    def tadistribution_combined(self, title, series, cells, beforeBisector, afterBisector, writer, colcursor, rowcursor, chartcolcursor, chartrowcursor, sheetname="TA"):
        series = [
            'sum([L_RA_TA_UE_Index0])','sum([L_RA_TA_UE_Index1])','sum([L_RA_TA_UE_Index2])','sum([L_RA_TA_UE_Index3])',
            'sum([L_RA_TA_UE_Index4])','sum([L_RA_TA_UE_Index5])','sum([L_RA_TA_UE_Index6])','sum([L_RA_TA_UE_Index7])',
            'sum([L_RA_TA_UE_Index8])','sum([L_RA_TA_UE_Index9])','sum([L_RA_TA_UE_Index10])','sum([L_RA_TA_UE_Index11])']

        columns = [
            'Period',
            'Sum of (0m - 78m)','Sum of (78m - 234m)','Sum of (234m - 546m)','Sum of (546m - 1014m)',
            'Sum of (1014m - 1950m)','Sum of (1950m - 3510m)','Sum of (3510m - 6630m)','Sum of (6630m - 14430m)',
            'Sum of (14430m -30030m)','Sum of (30030m - 53430m)','Sum of (53430m - 76830m)','Sum of (> - 76830m)',
        ]
    
        conn = self.conn
        if conn:
            cursor = conn.cursor()
            data = []
            
            # Query bf bisector
            query = 'SELECT {} FROM maxis_lte WHERE [Cell Name] LIKE "{}%" and date([Date]) = date("{}") '.format(",".join(series), cells, self.beforeBisector)
            for row in cursor.execute(query):
                data.append(["Before Bisector"] + list(row))

            # Query af bisector
            query = 'SELECT {} FROM maxis_lte WHERE [Cell Name] LIKE "{}%" and date([Date]) = date("{}") '.format(",".join(series), cells, self.afterBisector)
            for row in cursor.execute(query):
                data.append(["After Bisector"] + list(row))

            if len(data) == 0:
                print("---- Data Empty ----")
                return writer, colcursor, rowcursor, chartcolcursor, chartrowcursor
                
            df = pd.DataFrame(data, columns=columns)
            df = df.set_index("Period")
            
            row = len(df.index) # number of row 
            col = len(df.columns) # number of column excluded index

            rawdatasheetname = sheetname + "(RAW)"

            df.to_excel(writer, sheet_name=rawdatasheetname, startcol=colcursor, startrow=rowcursor+1)

            wb = writer.book
            ws = wb.get_worksheet_by_name(rawdatasheetname)
            if ws:
                ws.write_string(rowcursor, colcursor, title)
            ws = wb.get_worksheet_by_name(sheetname)
            if not ws:
                ws = wb.add_worksheet(sheetname)

            chart = wb.add_chart({"type":"line"})

            for x in range(rowcursor+2, rowcursor+2+row):
                chart.add_series({
                    'name':[rawdatasheetname, x, colcursor],
                    'categories': [rawdatasheetname, rowcursor + 1, colcursor + 1 , rowcursor + 1, colcursor + col],
                    'values':[rawdatasheetname, x, colcursor + 1 , x, colcursor + col]
                })

            # Configure the chart axes.
            chart.set_title({'name':title})
            chart.set_y_axis({'major_gridlines': {'visible': True}})  
            
            # Set a default data table on the X-Axis.
            chart.set_table({'show_keys':True})

            chart.set_legend({'none':True})
            chart.set_size({'width':959, 'height':315}) # 15 columns, 16 rows
            
            # Insert the chart into the worksheet.
            ws.insert_chart(chartrowcursor, chartcolcursor, chart)

            # calculate cursor
            rowcursor += row + 3 # add one row due to current row data exist, one row for title and one row for cosmetic
            chartrowcursor += 16 # chart size take approximate 16 rows

        return writer, colcursor, rowcursor, chartcolcursor, chartrowcursor

    def mainkpi(self, title, series, cells, targetName, targetValue, writer, colcursor, rowcursor, chartcolcursor, chartrowcursor, sheetname="Sheet3"):
        query = 'SELECT date([Date]) as [Date], [Cell Name], {} FROM maxis_lte WHERE [Cell Name] LIKE "{}%" AND date([Date]) >= date("{}") AND date([Date]) <= date("{}") GROUP BY date([Date]), [Cell Name]'.format(series, cells, self.startDate, self.endDate)
        conn = self.conn
        if conn:
            cursor = conn.cursor()
            data = []
            for row in cursor.execute(query):
                data.append(list(row))

            if len(data) == 0:
                print("---- Data Empty ----")
                return writer, colcursor, rowcursor, chartcolcursor, chartrowcursor

            df = pd.DataFrame(data, columns=['Date','Cell','Series']).pivot(index = "Date", columns="Cell", values="Series")
            df[targetName] = targetValue

            row = len(df.index) # number of row 
            col = len(df.columns) # number of column excluded index

            rawdatasheetname = sheetname + "(RAW)"

            df.to_excel(writer, sheet_name=rawdatasheetname, startcol=colcursor, startrow=rowcursor+1)

            wb = writer.book
            ws = wb.get_worksheet_by_name(rawdatasheetname)
            if ws:
                ws.write_string(rowcursor, colcursor, title)
            ws = wb.get_worksheet_by_name(sheetname)
            if not ws:
                ws = wb.add_worksheet(sheetname)

            chart = wb.add_chart({"type":"line"})

            for x in range(colcursor+1, colcursor+col+1):
                if x == colcursor+col:
                    chart.add_series({
                        'name': [rawdatasheetname, rowcursor+1, x],
                        'categories': [rawdatasheetname, rowcursor+2, colcursor, rowcursor+row+1, colcursor],
                        'values': [rawdatasheetname, rowcursor+2, x, rowcursor+row+1, x],
                        'line':{
                            'color':'red',
                            'dash_type':'dash'
                        }
                    })
                else:
                    chart.add_series({
                        'name': [rawdatasheetname, rowcursor+1, x],
                        'categories': [rawdatasheetname, rowcursor+2, colcursor, rowcursor+row+1, colcursor],
                        'values': [rawdatasheetname, rowcursor+2, x, rowcursor+row+1, x],
                        'marker':{'type':'circle'}
                    })
            
            # Configure the chart axes.
            chart.set_title({'name':title})
            chart.set_y_axis({'major_gridlines': {'visible': True}})  
            chart.set_legend({'position':'right'})
            chart.set_size({'width':638, 'height':315}) # 10 columns, 16 rows

            # Insert the chart into the worksheet.
            ws.insert_chart(chartrowcursor, chartcolcursor, chart)

            rowcursor += row + 3 # add one row due to current row data exist, one row for title, one row for cosmetic
            if chartcolcursor == 0:
                chartcolcursor += 10
            else:
                chartcolcursor = 0
                chartrowcursor += 16 # next chart column

        return writer, colcursor, rowcursor, chartcolcursor, chartrowcursor

    def bisector_combined(self, title, series, cell1, cell2, writer, colcursor, rowcursor, chartcolcursor, chartrowcursor, sheetname="Sheet2"):
        query = 'SELECT date([Date]) as [Date], [Cell Name], {} FROM maxis_lte WHERE ([Cell Name] = "{}"  or [Cell Name] = "{}") AND date([Date]) >= date("{}") AND date([Date]) <= date("{}")  GROUP BY date([Date]), [Cell Name]'.format(series, cell1, cell2, self.startDate, self.endDate)
        conn = self.conn
        if conn:
            cursor = conn.cursor()
            data = []

            
            for row in cursor.execute(query):
                data.append(list(row))
            
            if len(data) == 0:
                print("---- Data Empty ----")
                return writer, colcursor, rowcursor, chartcolcursor, chartrowcursor

            df = pd.DataFrame(data, columns=['Date','Cell','Series']).pivot(index = "Date", columns="Cell", values="Series")
            df = df.eval("Total = {}".format("+".join([cell1,cell2])))

            row = len(df.index) # number of row 
            col = len(df.columns) # number of column excluded index

            rawdatasheetname = sheetname + "(RAW)"
            df.to_excel(writer, sheet_name=rawdatasheetname, startcol=colcursor, startrow=rowcursor+1)
            wb = writer.book

            ws = wb.get_worksheet_by_name(rawdatasheetname)
            if ws:
                ws.write_string(rowcursor, colcursor, title)
            ws = wb.get_worksheet_by_name(sheetname)
            if not ws:
                ws = wb.add_worksheet(sheetname)

            chart = wb.add_chart({"type":"line"})

            for x in range(colcursor+1, colcursor+col):
                chart.add_series({
                    'name': [rawdatasheetname, rowcursor+1, x],
                    'categories': [rawdatasheetname, rowcursor+2, colcursor, rowcursor+row+1, colcursor],
                    'values': [rawdatasheetname, rowcursor+2, x, rowcursor+row+1, x],
                    'marker':{'type':'circle'}
                })
            
            # Configure the chart axes.
            chart.set_title({'name':title})
            chart.set_y_axis({'major_gridlines': {'visible': True}})  
            chart.set_legend({'position':'bottom'})
            chart.set_size({'width':638, 'height':315}) # 10 columns, 16 rows

            # Insert the chart into the worksheet.
            ws.insert_chart(chartrowcursor, chartcolcursor, chart)
            chartcolcursor += 10

            # add second total combined chart
            chart = wb.add_chart({"type":"line"})

            chart.add_series({
                'name': [rawdatasheetname, rowcursor+1, colcursor+col],
                'categories': [rawdatasheetname, rowcursor+2, colcursor, rowcursor+row+1, colcursor],
                'values': [rawdatasheetname, rowcursor+2, colcursor+col, rowcursor+row+1, colcursor+col],
                'marker':{'type':'circle'}
            })
            
            # Configure the chart axes.
            chart.set_title({'name':title})
            chart.set_y_axis({'major_gridlines': {'visible': True}})  
            chart.set_legend({'position':'bottom'})
            chart.set_size({'width':638, 'height':315}) # 10 columns, 16 rows

            # Insert the chart into the worksheet.
            ws.insert_chart(chartrowcursor, chartcolcursor, chart)

            rowcursor += row + 3 # add one row due to current row data exist, one row for title, and one row for cosmetic
            chartrowcursor += 16 + 1 # add one row for cosmetic

        return writer, colcursor, rowcursor, chartcolcursor, chartrowcursor

    def bisector(self, title, series, cell1, cell2, writer, colcursor, rowcursor, chartcolcursor, chartrowcursor, sheetname="Sheet2"):
        query = 'SELECT date([Date]) as [Date], [Cell Name], {} FROM maxis_lte WHERE ([Cell Name] = "{}"  or [Cell Name] = "{}") AND date([Date]) >= date("{}") AND date([Date]) <= date("{}")  GROUP BY date([Date]), [Cell Name]'.format(series, cell1, cell2, self.startDate, self.endDate)
        conn = self.conn
        if conn:
            cursor = conn.cursor()
            data = []

            for row in cursor.execute(query):
                data.append(list(row))
            
            if len(data) == 0:
                print("---- Data Empty ----")
                return writer, colcursor, rowcursor, chartcolcursor, chartrowcursor

            df = pd.DataFrame(data, columns=['Date','Cell','Series']).pivot(index = "Date", columns="Cell", values="Series")

            row = len(df.index) # number of row 
            col = len(df.columns) # number of column excluded index

            rawdatasheetname = sheetname + "(RAW)"
            df.to_excel(writer, sheet_name=rawdatasheetname, startcol=colcursor, startrow=rowcursor+1)
            wb = writer.book

            ws = wb.get_worksheet_by_name(rawdatasheetname)
            if ws:
                ws.write_string(rowcursor, colcursor, title)
            ws = wb.get_worksheet_by_name(sheetname)
            if not ws:
                ws = wb.add_worksheet(sheetname)

            chart = wb.add_chart({"type":"line"})

            for x in range(colcursor+1, colcursor+col+1):
                chart.add_series({
                    'name': [rawdatasheetname, rowcursor+1, x],
                    'categories': [rawdatasheetname, rowcursor+2, colcursor, rowcursor+row+1, colcursor],
                    'values': [rawdatasheetname, rowcursor+2, x, rowcursor+row+1, x],
                    'marker':{'type':'circle'}
                })
            
            # Configure the chart axes.
            chart.set_title({'name':title})
            chart.set_y_axis({'major_gridlines': {'visible': True}})  
            chart.set_legend({'position':'bottom'})
            chart.set_size({'width':638, 'height':315}) # 10 columns, 16 rows

            # Insert the chart into the worksheet.
            ws.insert_chart(chartrowcursor, chartcolcursor, chart)

            rowcursor += row + 3 # add one row due to current row data exist, one row for title, and one row for cosmetic
            chartrowcursor += 16 + 1 # add one row for cosmetic

        return writer, colcursor, rowcursor, chartcolcursor, chartrowcursor

    def layer(self, title, series, cell,  writer, colcursor, rowcursor, chartcolcursor, chartrowcursor, sheetname="Sheet1"):
        query = 'SELECT date([Date]) as [Date], [Cell Name], {} FROM maxis_lte WHERE [Cell Name] LIKE "{}%" AND date([Date]) >= date("{}") AND date([Date]) <= date("{}")  GROUP BY date([Date]), [Cell Name]'.format(series, cell, self.startDate, self.endDate)
        conn = self.conn
        if conn:
            cursor = conn.cursor()
            sectors = []
            data = []
            max_row = 0 # store the max row
            for row in cursor.execute(query):
                [sector_number] = re.findall(r'\w.+_(\w{1})', row[1] , re.IGNORECASE)
                if not sector_number in sectors:
                    sectors.append(sector_number)
                data.append(list(row))
            
            if len(data) == 0:
                print("---- Data Empty ----")
                return writer, colcursor, rowcursor, chartcolcursor, chartrowcursor

            df = pd.DataFrame(data, columns=['Date','Cell','Series'])
        
            oddeven = len(sectors) % 2

            for index, sector in enumerate(sectors):
                sector_df = df[df['Cell'].str.contains(r"\w.+_("+ sector + r"{1})", regex=True)].pivot(index="Date",columns="Cell",values="Series")
                
                row = len(sector_df.index) # number of row 
                col = len(sector_df.columns) # number of column excluded index
                if row > max_row:
                    max_row = row
                
                
                rawdatasheetname = sheetname+"(RAW)"

                wb = writer.book

                sector_df.to_excel(writer, sheet_name=rawdatasheetname, startcol=colcursor, startrow=rowcursor+1)
                ws = wb.get_worksheet_by_name(rawdatasheetname)
                if ws:
                    ws.write_string(rowcursor, colcursor, title)
                    #rowcursor += 1

                ws = wb.get_worksheet_by_name(sheetname)
                if not ws:
                    ws = wb.add_worksheet(sheetname)
                #ws = writer.sheets[sheetname]
                chart = wb.add_chart({"type":"line"})
                
                for x in range(colcursor+1, colcursor+col+1):
                    chart.add_series({
                        'name': [rawdatasheetname, rowcursor+1, x],
                        'categories': [rawdatasheetname, rowcursor+2, colcursor, rowcursor+row+1, colcursor],
                        'values': [rawdatasheetname, rowcursor+2, x, rowcursor+row+1, x],
                        'marker':{'type':'circle'}
                    })
                
                # Configure the chart axes.
                chart.set_title({'name':title})
                chart.set_y_axis({'major_gridlines': {'visible': True}})  
                chart.set_legend({'position':'bottom'})
                chart.set_size({'width':638, 'height':315}) # 10 columns, 16 rows

                # Insert the chart into the worksheet.
                ws.insert_chart(chartrowcursor, chartcolcursor, chart)
                chartcolcursor += 10

                # if odd number index need to append next chart in below
                if index % 2 == 1:
                    chartrowcursor += 16
                    if index == len(sectors) -  2 and oddeven == 1:
                        chartcolcursor = 5
                    else:
                        chartcolcursor = 0

                colcursor += len(sector_df.columns) + 2 # index + 1 spacing
            # Close the Pandas Excel writer and output the Excel file.
            rowcursor += max_row + 3 # add one row due to current row data exist and another row for cosmetic and add one more row for title
            chartrowcursor +=  1 # add one row for cosmetic

        return writer, colcursor, rowcursor, chartcolcursor, chartrowcursor

    def generateReport(self):
        
        # Generate Layer Chart
        _rowcursor = 0
        _chartrowcursor = 0

        for series in self.layerSeries:
            _colcursor = 0
            _chartcolcursor = 0
            self.writer, _colcursor, _rowcursor, _chartcolcursor, _chartrowcursor = self.layer(series['title'], series['series'], self.sitename, self.writer, _colcursor, _rowcursor, _chartcolcursor, _chartrowcursor, "Layer")
        
        # Generate Bisector Chart
        # reset cursor to 0 for another sheet
        _rowcursor = 0
        _chartrowcursor = 0

        for series in self.bisectorSeries:
            _colcursor = 0
            _chartcolcursor = 0
            self.writer, _colcursor, _rowcursor, _chartcolcursor, _chartrowcursor = self.bisector(series['title'], series['series'], self.bisec1, self.bisec2, self.writer, _colcursor, _rowcursor, _chartcolcursor, _chartrowcursor, "Bisector")

        # Generate KPI Chart
        # reset cursor to 0 for another sheet
        _rowcursor = 0
        _chartrowcursor = 0
        for series in self.kpiseries:
            _colcursor = 0
            #_chartcolcursor = 0
            self.writer, _colcursor, _rowcursor, _chartcolcursor, _chartrowcursor = self.mainkpi(series['title'], series['series'], self.sitename , series['targetName'], series['targetValue'], self.writer, _colcursor, _rowcursor, _chartcolcursor, _chartrowcursor, "BH KPI")
            
        # Generate TA Chart & Table
        # reset cursor to 0 for another sheet
        _rowcursor = 0
        _chartrowcursor = 0
        _colcursor = 0
        _chartcolcursor = 0

        self.writer, _colcursor, _rowcursor, _chartcolcursor, _chartrowcursor = self.tadistribution_combined("% TA Distribution_Combined", None , self.sitename , "2019-09-16", "2019-09-17", self.writer, _colcursor, _rowcursor, _chartcolcursor, _chartrowcursor)
        self.writer, _colcursor, _rowcursor, _chartcolcursor, _chartrowcursor = self.tadistribution_cell("% TA Distribution_Cell", None  , self.bisec1, self.bisec2 , "2019-09-17", self.writer, _colcursor, _rowcursor, _chartcolcursor, _chartrowcursor)
        self.writer, _colcursor, _rowcursor, _chartcolcursor, _chartrowcursor = self.tadistribution_all("TA", None  , self.sitename , "2019-09-17", self.writer, _colcursor, _rowcursor, _chartcolcursor, _chartrowcursor)
        self.writer, _colcursor, _rowcursor, _chartcolcursor, _chartrowcursor = self.tadistribution_table("TA Percentage" , None  , self.sitename , "2019-09-17", self.writer, _colcursor, _rowcursor, _chartcolcursor, _chartrowcursor)        

        # Genearte Combined Traffic
        # reset cursor to 0 for another sheet
        _rowcursor = 0
        _chartrowcursor = 0
        for series in self.combinedSeries:
            _colcursor = 0
            _chartcolcursor = 0
            self.writer, _colcursor, _rowcursor, _chartcolcursor, _chartrowcursor = self.bisector_combined(series['title'], series['series'], self.bisec1, self.bisec2, self.writer, _colcursor, _rowcursor, _chartcolcursor, _chartrowcursor, "DL User Traffic Combine")
        
        # Write output
        self.writer.save()