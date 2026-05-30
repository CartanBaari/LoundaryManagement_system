import { useEffect, useMemo, useState } from 'react';
import { Tags, Search, Layers, ClipboardList, X, Plus, Edit2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import FeatureWorkspace from '../components/common/FeatureWorkspace';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { categoryAPI } from '../services/api';

const initialFormState = {
  name: '',
  description: '',
  status: 'active',
};

const ItemsCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [categoryForm, setCategoryForm] = useState(initialFormState);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoading(true);
        const response = await categoryAPI.getAll();
        setCategories(response.data?.categories || []);
      } catch (error) {
        toast.error('Failed to load categories');
      } finally {
        setLoading(false);
      }
    };

    loadCategories();
  }, []);

  const filteredCategories = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      return categories;
    }

    return categories.filter(
      (category) =>
        category.name.toLowerCase().includes(query) ||
        category.description.toLowerCase().includes(query) ||
        category.status.toLowerCase().includes(query)
    );
  }, [categories, searchTerm]);

  const stats = useMemo(() => {
    const activeCategories = categories.filter((category) => category.status === 'active').length;
    const reviewCategories = categories.filter((category) => category.status === 'review').length;

    return [
      {
        label: 'Categories',
        value: String(categories.length),
        badge: 'Catalog',
        icon: Tags,
        tone: 'indigo',
        helper: 'Laundry categories currently available in the system',
      },
      {
        label: 'Active',
        value: String(activeCategories),
        badge: 'Visible',
        icon: Layers,
        tone: 'sky',
        helper: 'Categories ready to be used for services',
      },
      {
        label: 'Needs Review',
        value: String(reviewCategories),
        badge: 'Attention',
        icon: ClipboardList,
        tone: 'amber',
        helper: 'Categories waiting for updates or approval',
      },
    ];
  }, [categories]);

  const closeCategoryModal = () => {
    setShowCategoryModal(false);
    setEditingCategoryId(null);
    setCategoryForm(initialFormState);
  };

  const handleCategoryInputChange = (e) => {
    const { name, value } = e.target;
    setCategoryForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();

    const payload = {
      name: categoryForm.name.trim(),
      description: categoryForm.description.trim(),
      status: categoryForm.status,
    };

    if (!payload.name || !payload.description) {
      toast.error('Please complete all category fields');
      return;
    }

    setSubmitting(true);

    try {
      if (editingCategoryId) {
        const response = await categoryAPI.update(editingCategoryId, payload);
        setCategories((prev) =>
          prev.map((category) => (category._id === editingCategoryId ? response.data.category : category))
        );
        toast.success('Category updated successfully');
      } else {
        const response = await categoryAPI.create(payload);
        setCategories((prev) => [response.data.category, ...prev]);
        toast.success('Category added successfully');
      }

      closeCategoryModal();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditCategory = (category) => {
    setEditingCategoryId(category._id);
    setCategoryForm({
      name: category.name,
      description: category.description,
      status: category.status,
    });
    setShowCategoryModal(true);
  };

  const handleDeleteCategory = async (categoryId) => {
    if (!window.confirm('Are you sure you want to delete this category?')) {
      return;
    }

    try {
      await categoryAPI.delete(categoryId);
      setCategories((prev) => prev.filter((category) => category._id !== categoryId));
      toast.success('Category deleted successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete category');
    }
  };

  return (
    <>
      <FeatureWorkspace
        eyebrow="Catalog Control"
        title="Categories"
        description="Manage laundry categories with clear descriptions, statuses, and consistent dashboard organization."
        tone="indigo"
        actions={[
          {
            label: 'Add Category',
            icon: Plus,
            variant: 'primary',
            onClick: () => {
              setEditingCategoryId(null);
              setCategoryForm(initialFormState);
              setShowCategoryModal(true);
            },
            className: 'rounded-2xl bg-[#3a2fd0] px-6 py-3 hover:bg-[#2f26af]',
          },
        ]}
        stats={stats}
        filters={[
          {
            label: 'search',
            icon: Search,
            content: (
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search category name, description, or status..."
                className="w-[320px] max-w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
              />
            ),
          },
        ]}
        tableTitle="Category List"
        tableDescription={`Manage category records only. Showing ${filteredCategories.length} categor${filteredCategories.length === 1 ? 'y' : 'ies'}.`}
        columns={[
          {
            key: 'name',
            label: 'Name',
            render: (value) => (
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-100 text-[#3a2fd0]">
                  <Tags className="h-5 w-5" />
                </div>
                <span className="font-semibold text-slate-900">{value}</span>
              </div>
            ),
          },
          {
            key: 'description',
            label: 'Description',
            className: 'whitespace-normal min-w-[260px]',
          },
          {
            key: 'status',
            label: 'Status',
            render: (value) => (
              <span
                className={`rounded-full px-3 py-1 text-sm font-medium ${
                  value === 'active'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-amber-100 text-amber-700'
                }`}
              >
                {value === 'active' ? 'Active' : 'Review'}
              </span>
            ),
          },
          {
            key: 'actions',
            label: 'Actions',
            render: (_, row) => (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleEditCategory(row)}
                  className="rounded-xl p-2 text-slate-600 transition-colors hover:bg-slate-100"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteCategory(row._id)}
                  className="rounded-xl p-2 text-red-600 transition-colors hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ),
          },
        ]}
        rows={filteredCategories}
        sidePanels={[
          {
            title: 'Category Notes',
            description: 'Current category descriptions available to the team.',
            content: (
              <div className="space-y-3">
                {categories.map((category) => (
                  <div key={category._id} className="rounded-2xl bg-[#f6f5ff] p-4 text-slate-700">
                    <p className="font-semibold text-slate-900">{category.name}</p>
                    <p className="mt-1 text-sm text-slate-600">{category.description}</p>
                  </div>
                ))}
              </div>
            ),
          },
          {
            title: 'Status Overview',
            description: 'A quick view of category readiness across the catalog.',
            content: (
              <div className="space-y-4">
                {[
                  `${categories.filter((category) => category.status === 'active').length} active categories are available now`,
                  `${categories.filter((category) => category.status === 'review').length} categories are pending review`,
                  'Service forms now choose category from this list as a dropdown',
                ].map((item) => (
                  <div key={item} className="rounded-2xl bg-[#fafaff] p-4 text-slate-700">
                    {item}
                  </div>
                ))}
              </div>
            ),
          },
        ]}
      />

      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-xl rounded-[28px] border-indigo-100 shadow-[0_30px_80px_rgba(58,47,208,0.18)]">
            <CardHeader className="border-b border-slate-100 pb-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-2xl">{editingCategoryId ? 'Edit Category' : 'Add New Category'}</CardTitle>
                  <CardDescription>
                    {editingCategoryId
                      ? 'Update the category details while keeping the rest of the catalog intact.'
                      : 'Create a new laundry category with a clear description and status.'}
                  </CardDescription>
                </div>
                <button
                  type="button"
                  onClick={closeCategoryModal}
                  className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleAddCategory} className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Name</label>
                  <input
                    type="text"
                    name="name"
                    value={categoryForm.name}
                    onChange={handleCategoryInputChange}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-[#3a2fd0] focus:outline-none focus:ring-2 focus:ring-[#3a2fd0]/15"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Description</label>
                  <textarea
                    name="description"
                    value={categoryForm.description}
                    onChange={handleCategoryInputChange}
                    rows={4}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-[#3a2fd0] focus:outline-none focus:ring-2 focus:ring-[#3a2fd0]/15"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Status</label>
                  <select
                    name="status"
                    value={categoryForm.status}
                    onChange={handleCategoryInputChange}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 focus:border-[#3a2fd0] focus:outline-none focus:ring-2 focus:ring-[#3a2fd0]/15"
                  >
                    <option value="active">Active</option>
                    <option value="review">Review</option>
                  </select>
                </div>

                <div className="flex gap-4 pt-2">
                  <Button type="submit" variant="primary" disabled={submitting} className="flex-1 rounded-2xl bg-[#3a2fd0] py-3 hover:bg-[#2f26af]">
                    {submitting ? 'Saving...' : editingCategoryId ? 'Update Category' : 'Add Category'}
                  </Button>
                  <Button type="button" variant="outline" onClick={closeCategoryModal} className="flex-1 rounded-2xl py-3">
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
};

export default ItemsCategories;
