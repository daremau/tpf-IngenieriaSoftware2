"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Search, PlusCircle, Edit, Trash2, FileText, ArrowUpDown } from 'lucide-react'
import { NewProductForm } from "./NuevoProducto"

interface Product {
  IdProducto: string
  NombreProducto: string 
  Tipo: "Alimento" | "Juguete" | "Accesorio" | "Higiene" | "Medicamento" | "Otro"
  Descripcion: string
  PrecioCompra: number
  PrecioVenta: number
  Descuento: number
  Proveedor: string
  Existencia: number
  FechaIngreso: string
}

export interface NewProduct {
  nombreProducto: string
  tipo: "Alimento" | "Juguete" | "Accesorio" | "Higiene" | "Medicamento" | "Otro"
  descripcion: string
  precioCompra: number
  precioVenta: number
  stock: number
  descuento: number
  proveedor: string
}

export function InventoryManagement() {
  const [products, setProducts] = useState<Product[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [inventorySortOrder, setInventorySortOrder] = useState<'asc' | 'desc'>('desc')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAddProductDialogOpen, setIsAddProductDialogOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isEditProductDialogOpen, setIsEditProductDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [isGenerateReportDialogOpen, setIsGenerateReportDialogOpen] = useState(false)
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")
  const totalInventoryValue = products.reduce((sum, item) => 
    sum + (item.PrecioCompra * item.Existencia), 0
  )

  const totalInventorySaleValue = products.reduce((sum, item) => 
    sum + (item.PrecioVenta * item.Existencia), 0
  )

  const toggleInventorySort = () => {
    setInventorySortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
  }

  const handleAddProduct = (newProduct: Product) => {
    setProducts([...products, newProduct])
    setIsAddProductDialogOpen(false)
  }

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setIsEditProductDialogOpen(true)
  }

  const handleUpdateProduct = async (updatedProduct: Product) => {
    try {
      const response = await fetch(`/api/producto/${updatedProduct.IdProducto}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedProduct)
      })
  
      if (response.ok) {
        setProducts(products.map(product => 
          product.IdProducto === updatedProduct.IdProducto ? updatedProduct : product
        ))
        setIsEditProductDialogOpen(false)
        setEditingProduct(null)
      } else {
        throw new Error('Error al actualizar el producto')
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('/api/producto')
        if (!response.ok) {
          throw new Error('Error al cargar productos')
        }
        const data = await response.json()
        
        // Validate the data before setting it to state
        if (Array.isArray(data) && data.every(item => 
          item && 
          typeof item.NombreProducto === 'string' &&
          typeof item.IdProducto !== 'undefined'
        )) {
          setProducts(data)
        } else {
          throw new Error('Formato de datos inválido')
        }
      } catch (error) {
        console.error('Error:', error)
        setError(error instanceof Error ? error.message : 'Error al cargar productos')
        setProducts([]) // Set empty array on error
      } finally {
        setIsLoading(false)
      }
    }
  
    fetchProducts()
  }, [])

const handleDelete = async (productId: string) => {
  if (confirm('¿Está seguro que desea eliminar este producto?')) {
    setDeletingId(productId);
    try {
      const response = await fetch(`/api/producto?id=${productId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setProducts(products.filter(product => product.IdProducto !== productId));
      } else {
        throw new Error('Error al eliminar el producto');
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setDeletingId(null);
    }
  }
};

const handleGenerateReport = async () => {
  // 1. Validaciones iniciales 
  if (!startDate || !endDate) {
    alert("Por favor seleccione ambas fechas")
    return
  }

  const start = new Date(startDate)
  const end = new Date(endDate)

  if (start > end) {
    alert("La fecha de inicio debe ser anterior a la fecha final")
    return
  }

  try {
    // 2. Obtener detalles de facturas en el rango de fechas
    const response = await fetch(
      `/api/detallefactura/producto?startDate=${startDate}&endDate=${endDate}`
    )

    if (!response.ok) {
      throw new Error('Error al obtener datos de facturas')
    }

    const detalles = await response.json()

    // 3. Calcular totales
    let ingresos = 0
    let gastos = 0

    detalles.forEach((detalle: any) => {
      if (detalle.id_producto) {
        // Convert subtotal to number and add to ingresos
        ingresos += Number(detalle.subtotal)
        
        // Calculate costs
        const producto = products.find(p => p.IdProducto === detalle.id_producto)
        if (producto) {
          gastos += producto.PrecioCompra * detalle.cantidad
        }
      }
    })

    // 4. Crear el reporte - ensure values are integers
    const reporteData = {
      fecha: `${format(start, 'dd/MM/yy')}-${format(end, 'dd/MM/yy')}`,
      nombre: 'Reporte Productos',
      ingresos: Math.round(ingresos), // Convert to integer
      gastos: Math.round(gastos) // Convert to integer
    }

    // 5. Guardar el reporte
    const saveResponse = await fetch('/api/reportes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(reporteData)
    })

    if (!saveResponse.ok) {
      throw new Error('Error al guardar el reporte')
    }

    // 6. Cerrar diálogo y mostrar confirmación
    setIsGenerateReportDialogOpen(false)
    setStartDate("")
    setEndDate("")
    alert('Reporte generado exitosamente')

  } catch (error) {
    console.error('Error:', error)
    alert('Error al generar el reporte')
  }
}

  if (isLoading) {
    return <div>Cargando...</div>
  }

  if (error) {
    return <div>Error: {error}</div>
  }

  const filteredProducts = products.filter(product => 
    product && product.NombreProducto && 
    (product.NombreProducto.toLowerCase().includes(searchQuery.toLowerCase()) ||
     (product.IdProducto && product.IdProducto.toString().includes(searchQuery)))
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 w-full max-w-sm">
          <Search className="w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código o nombre..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={toggleInventorySort}
            className="ml-2"
          >
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Tipo</TableHead> 
              <TableHead className="text-right">Precio Venta</TableHead>
              <TableHead className="text-right">Precio Compra</TableHead>
              <TableHead className="text-right">
                Cantidad
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-2 h-8 w-8 p-0"
                  onClick={toggleInventorySort}
                >
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead className="text-right">Descuento</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead className="w-[100px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.map((product) => (
              <TableRow key={product.IdProducto}>
                <TableCell>{product.IdProducto}</TableCell>
                <TableCell>{product.NombreProducto}</TableCell>
                <TableCell>{product.Tipo || 'No especificado'}</TableCell>
                <TableCell className="text-right">{product.PrecioVenta.toLocaleString()} Gs.</TableCell>
                <TableCell className="text-right">{product.PrecioCompra.toLocaleString()} Gs.</TableCell>
                <TableCell className="text-right">{product.Existencia || 0}</TableCell>
                <TableCell>{product.Proveedor || 'No especificado'}</TableCell>
                <TableCell className="text-right">{product.Descuento}%</TableCell>
                <TableCell>{product.Descripcion}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(product)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(product.IdProducto)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-4">
          <div className="space-y-1">
            <p className="text-2xl font-bold">{totalInventoryValue.toLocaleString()} Gs.</p>
            <p className="text-sm text-muted-foreground">Dinero total en inventario (compra)</p>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold">{totalInventorySaleValue.toLocaleString()} Gs.</p>
            <p className="text-sm text-muted-foreground">Dinero total en inventario (a la venta)</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Dialog open={isAddProductDialogOpen} onOpenChange={setIsAddProductDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <PlusCircle className="h-4 w-4" />
                Agregar productos
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Agregar Nuevo Producto</DialogTitle>
              </DialogHeader>
              <NewProductForm
                onSubmit={handleAddProduct}
                onCancel={() => setIsAddProductDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
          <Dialog open={isGenerateReportDialogOpen} onOpenChange={setIsGenerateReportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Generar reporte
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Generar Reporte de Inventario</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="startDate" className="text-right col-span-1">
                    Fecha inicial
                  </label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="endDate" className="text-right col-span-1">
                    Fecha final
                  </label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="col-span-3"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="secondary" onClick={() => setIsGenerateReportDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="button" onClick={handleGenerateReport}>
                  Generar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      {editingProduct && (
        <Dialog open={isEditProductDialogOpen} onOpenChange={setIsEditProductDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Editar Producto</DialogTitle>
            </DialogHeader>
            <NewProductForm
              editMode={true}
              initialProduct={{
                IdProducto: editingProduct.IdProducto,
                nombreProducto: editingProduct.NombreProducto,
                tipo: editingProduct.Tipo,
                descripcion: editingProduct.Descripcion,
                precioCompra: editingProduct.PrecioCompra,
                precioVenta: editingProduct.PrecioVenta,
                stock: editingProduct.Existencia,
                descuento: editingProduct.Descuento,
                proveedor: editingProduct.Proveedor || ""
              }}
              onSubmit={handleUpdateProduct}
              onCancel={() => setIsEditProductDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}